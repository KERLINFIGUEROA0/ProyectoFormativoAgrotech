// src/modulos/modulos.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from "@nestjs/common";
import { ModulosService } from "./modulos.service";
import { CreateModuloDto } from "./dto/create-modulo.dto";
import { UpdateModuloDto } from "./dto/update-modulo.dto";

@Controller("modulos")
export class ModulosController {
  constructor(private readonly modulosService: ModulosService) {}

  @Post("crear")
  crear(@Body() data: CreateModuloDto) {
    return this.modulosService.crear(data);
  }

  @Get("listar")
  listar() {
    return this.modulosService.listar();
  }

  @Get("buscar/:id")
  buscarPorId(@Param("id") id: number) {
    return this.modulosService.buscarPorId(id);
  }

  @Put("actualizar/:id")
  actualizar(@Param("id") id: number, @Body() data: UpdateModuloDto) {
    return this.modulosService.actualizar(id, data);
  }

  @Delete("eliminar/:id")
  eliminar(@Param("id") id: number) {
    return this.modulosService.eliminar(id);
  }
}

