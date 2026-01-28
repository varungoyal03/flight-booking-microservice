const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/errors/app-error");

class CrudRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    const response = await this.model.create(data);

    return response;
  }

  async destroy(id) {
    const response = await this.model.destroy({
      where: { id },
    });
    return response;
  }

  async get(id) {
    const response = await this.model.findByPk(id);
    return response;
  }

  async getAll() {
    const response = await this.model.findAll();
    return response;
  }

  async update(id, data) {
    const response = await this.model.update(data, {
      where: { id },
    });
    return response;
  }
}

module.exports = CrudRepository;
