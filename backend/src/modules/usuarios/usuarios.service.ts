import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, Not,In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { join } from 'path';
import { Response } from 'express';
import * as XLSX from 'xlsx';

import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { CorreoService } from '../../correo/correo.service';
import { TipoUsuario } from '../tipo_usuario/entities/tipo_usuario.entity';
import { Ficha } from '../../modules/fichas/entities/ficha.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(TipoUsuario)
    private readonly tipoUsuarioRepository: Repository<TipoUsuario>,
    @InjectRepository(Ficha)
    private readonly fichaRepository: Repository<Ficha>,
    private readonly correoService: CorreoService,
  ) {}

  // ... (otros métodos como exportarExcel, cargarDesdeExcel, etc., no necesitan cambios)
    async exportarExcel(): Promise<Buffer> {
      const usuarios = await this.buscarTodos();
  
      // Filtrar usuarios: excluir administrador, incluir solo instructor, pasante, aprendiz, invitado
      const rolesPermitidos = ['instructor', 'pasante', 'aprendiz', 'invitado'];
      const usuariosFiltrados = usuarios.filter((u) =>
        u.tipoUsuario && rolesPermitidos.includes(u.tipoUsuario.nombre.toLowerCase())
      );
  
      const worksheetData = [
        // Encabezados que coinciden con la solicitud
        ['Tipo Identificacion', 'Identificacion', 'Nombre', 'Apellidos','Correo', 'Telefono','Estado', 'Rol', 'Id Ficha'],
        ...usuariosFiltrados.map((u) => [
          u.Tipo_Identificacion,
          u.identificacion,
          u.nombre,
          u.apellidos,
          u.correo,
          u.telefono,
          u.estado ? 'Activo' : 'Inactivo',
          u.tipoUsuario ? u.tipoUsuario.nombre : 'N/A',
          u.ficha ? u.ficha.id_ficha : '',
        ]),
      ];
  
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
  
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer',
      });
  
      return excelBuffer;
    }

  async exportarExcelFiltrado(filtros: any): Promise<Buffer> {
    let usuarios = await this.buscarTodos();

    // Filtrar usuarios: excluir administrador, incluir solo instructor, pasante, aprendiz, invitado
    const rolesPermitidos = ['instructor', 'pasante', 'aprendiz', 'invitado'];
    usuarios = usuarios.filter((u) =>
      u.tipoUsuario && rolesPermitidos.includes(u.tipoUsuario.nombre.toLowerCase())
    );

    // Aplicar filtros de búsqueda
    if (filtros.searchTerm && filtros.searchTerm.trim() !== '') {
      const lowercasedTerm = filtros.searchTerm.toLowerCase();
      usuarios = usuarios.filter(user => {
        const nombreCompleto = `${user.nombre} ${user.apellidos || ''}`.toLowerCase();
        const identificacion = String(user.identificacion).toLowerCase();
        const rol = user.tipoUsuario?.nombre.toLowerCase() || '';
        const ficha = user.ficha?.id_ficha?.toLowerCase() || '';
        return nombreCompleto.includes(lowercasedTerm) ||
                identificacion.includes(lowercasedTerm) ||
                rol.includes(lowercasedTerm) ||
                ficha.includes(lowercasedTerm);
      });
    }

    // Aplicar filtro de estado
    if (filtros.filterStatus === 'active') {
      usuarios = usuarios.filter(user => user.estado);
    } else if (filtros.filterStatus === 'inactive') {
      usuarios = usuarios.filter(user => !user.estado);
    }

    // Aplicar filtro de rol
    if (filtros.filterRol !== null) {
      usuarios = usuarios.filter(user => user.tipoUsuario?.id === filtros.filterRol);
    }

    // Aplicar filtro de ficha
    if (filtros.filterFicha !== null) {
      usuarios = usuarios.filter(user => user.ficha?.id_ficha === filtros.filterFicha);
    }

    const worksheetData = [
      ['Tipo Identificacion', 'Identificacion', 'Nombre', 'Apellidos','Correo', 'Telefono','Estado', 'Rol', 'Id Ficha'],
      ...usuarios.map((u) => [
        u.Tipo_Identificacion,
        u.identificacion,
        u.nombre,
        u.apellidos,
        u.correo,
        u.telefono,
        u.estado ? 'Activo' : 'Inactivo',
        u.tipoUsuario ? u.tipoUsuario.nombre : 'N/A',
        u.ficha ? u.ficha.id_ficha : '',
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios Filtrados');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });

    return excelBuffer;
  }

  async cargarDesdeExcel(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se ha subido ningún archivo.');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const usuariosJson: any[] = XLSX.utils.sheet_to_json(worksheet);

    const resultados: { creados: number; errores: any[] } = {
      creados: 0,
      errores: [],
    };

    for (const [index, rawUsuarioData] of usuariosJson.entries()) {
      const rowNum = index + 2; // Las filas de Excel son base 1, y saltamos la cabecera (fila 1)

      // Normalizar claves a minúsculas y sin espacios
      const usuarioData: { [key: string]: any } = {};
      for (const key in rawUsuarioData) {
        if (Object.prototype.hasOwnProperty.call(rawUsuarioData, key)) {
          usuarioData[key.toLowerCase().trim()] = rawUsuarioData[key];
        }
      }

      try {
        // Campos obligatorios: tipo_identidad, identificacion, nombre, apellido, correo, rol
        // ficha solo obligatoria para aprendices
        const camposObligatorios = [
          'tipo identificacion',
          'identificacion',
          'nombre',
          'apellidos',
          'correo',
          'rol'
        ];

        // Agregar ficha como obligatoria para aprendices y pasantes
        if (usuarioData.rol && (usuarioData.rol.toLowerCase() === 'aprendiz' || usuarioData.rol.toLowerCase() === 'pasante')) {
          camposObligatorios.push('id ficha');
        }

        // Campos opcionales: telefono
        const camposOpcionales = ['telefono'];

        // Validar campos obligatorios
        for (const campo of camposObligatorios) {
          if (!usuarioData[campo] || usuarioData[campo] === '') {
            throw new Error(`Campo obligatorio faltante: '${campo}'`);
          }
        }

        // Validar rol permitido
        const rolesPermitidos = ['instructor', 'pasante', 'aprendiz', 'invitado'];
        if (!rolesPermitidos.includes(usuarioData.rol.toLowerCase())) {
          throw new Error(`Rol no permitido: '${usuarioData.rol}'. Solo se permiten: ${rolesPermitidos.join(', ')}`);
        }

        const rol = await this.tipoUsuarioRepository.findOne({ where: { nombre: usuarioData.rol } });
        if (!rol) throw new Error(`El rol '${usuarioData.rol}' no existe.`);

        // Validar ficha para aprendices y pasantes
        if (usuarioData.rol.toLowerCase() === 'aprendiz' || usuarioData.rol.toLowerCase() === 'pasante') {
          if (!usuarioData['id ficha'] || usuarioData['id ficha'] === '') {
            throw new Error(`La ficha es obligatoria para el rol de ${usuarioData.rol.charAt(0).toUpperCase() + usuarioData.rol.slice(1)}.`);
          }
          const ficha = await this.fichaRepository.findOne({ where: { id_ficha: usuarioData['id ficha'] } });
          if (!ficha) {
            throw new Error(`La ficha con id_ficha '${usuarioData['id ficha']}' no existe.`);
          }
        }

        // Validar unicidad de correo
        const existeCorreo = await this.usuarioRepository.findOne({
          where: { correo: usuarioData.correo }
        });
        if (existeCorreo) {
          throw new Error(`El correo '${usuarioData.correo}' ya está registrado.`);
        }

        // Validar unicidad de identificación
        const existeIdentificacion = await this.usuarioRepository.findOne({
          where: { identificacion: usuarioData.identificacion }
        });
        if (existeIdentificacion) {
          throw new Error(`La identificación '${usuarioData.identificacion}' ya está registrada.`);
        }

        const createDto: CreateUsuarioDto = {
          nombre: usuarioData.nombre,
          apellidos: usuarioData.apellidos,
          correo: usuarioData.correo,
          identificacion: usuarioData.identificacion,
          Tipo_Identificacion: usuarioData['tipo identificacion'],
          telefono: usuarioData.telefono || '', // Opcional, usar vacío si no se proporciona
          password: String(usuarioData.identificacion),
          tipoUsuario: rol.id,
          ...((usuarioData.rol.toLowerCase() === 'aprendiz' || usuarioData.rol.toLowerCase() === 'pasante') && { id_ficha: usuarioData['id ficha'] }), // Para aprendices y pasantes
        };

        await this.crear(createDto);
        resultados.creados++;
      } catch (error) {
        resultados.errores.push({
          fila: rowNum,
          usuario: usuarioData.correo || usuarioData.identificacion || 'Desconocido',
          mensaje: error.message,
        });
      }
    }
    return resultados;
  }


  async buscar(criterios: { nombre?: string; identificacion?: string; rol?: string }) {
    const queryBuilder = this.usuarioRepository.createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.tipoUsuario', 'tipoUsuario')
      .leftJoinAndSelect('usuario.usuarioPermisos', 'usuarioPermisos')
      .leftJoinAndSelect('usuarioPermisos.permiso', 'permiso')
      .where('usuario.estado = :estado', { estado: true });

    if (criterios.nombre) {
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('LOWER(usuario.nombre) LIKE LOWER(:nombre)', { nombre: `%${criterios.nombre}%` })
          .orWhere('LOWER(usuario.apellidos) LIKE LOWER(:nombre)', { nombre: `%${criterios.nombre}%` });
      }));
    }

    if (criterios.identificacion) {
      queryBuilder.andWhere('CAST(usuario.identificacion AS TEXT) LIKE :identificacion', { identificacion: `%${criterios.identificacion}%` });
    }

    if (criterios.rol) {
      queryBuilder.andWhere('LOWER(tipoUsuario.nombre) LIKE LOWER(:rol)', { rol: `%${criterios.rol}%` });
    }

    const usuarios = await queryBuilder.getMany();

    // Ya no es necesario filtrar los permisos del usuario aquí
    return usuarios;
  }

  async findAssignableUsers(): Promise<Usuario[]> {
    return this.usuarioRepository.find({
      relations: ['tipoUsuario', 'ficha'], // Cargamos las relaciones
      where: {
        estado: true, // Solo usuarios activos
        tipoUsuario: {
          nombre: In(['Aprendiz', 'Pasante']), // Solo estos roles
        },
      },
      select: ['id', 'identificacion', 'nombre', 'apellidos', 'ficha', 'tipoUsuario'], // Traer solo lo necesario
    });
  }

  async buscarTodos() {
    const usuarios = await this.usuarioRepository.find({
      relations: ['tipoUsuario', 'usuarioPermisos', 'usuarioPermisos.permiso', 'ficha'],
    });

    // Transformar el estado para mejor presentación en la tabla
    return usuarios.map(usuario => ({
      ...usuario,
      estadoFormateado: usuario.estado ? 'Activo' : 'Inactivo',
      estadoColor: usuario.estado ? 'success' : 'danger',
      fichaNombre: usuario.ficha ? usuario.ficha.nombre : 'Sin ficha',
      fichaId: usuario.ficha ? usuario.ficha.id_ficha : null,
    }));
  }

  async buscarPorId(id: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: [
        'tipoUsuario',
        'tipoUsuario.rolPermisos',
        'tipoUsuario.rolPermisos.permiso',
        'tipoUsuario.rolPermisos.permiso.modulo',
        'usuarioPermisos',
        'usuarioPermisos.permiso',
        'usuarioPermisos.permiso.modulo',
      ],
    });

    if (!usuario) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    // Lógica para consolidar permisos para el frontend
    const permisosRol = (usuario.tipoUsuario?.rolPermisos || [])
      .map((rp) => rp.permiso.nombre);

    const permisosUsuario = (usuario.usuarioPermisos || [])
      .map((up) => up.permiso.nombre);

    const permisosFinales = new Set<string>([...permisosRol, ...permisosUsuario]);

    return {
      ...usuario,
      permisos: Array.from(permisosFinales),
    };
  }
  
    async actualizar(id: number, data: UpdateUsuarioDto): Promise<Usuario> {
      const usuario = await this.usuarioRepository.findOne({
        where: { id },
        relations: ['tipoUsuario']
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
  
      // Validar unicidad de identificación si se está cambiando
      if (data.identificacion !== undefined && data.identificacion !== usuario.identificacion) {
        const existeIdentificacion = await this.usuarioRepository.findOne({
          where: { identificacion: data.identificacion, id: Not(id) }
        });
        if (existeIdentificacion) {
          throw new BadRequestException(`La identificación '${data.identificacion}' ya está registrada.`);
        }
      }
  
      // Validar unicidad de correo si se está cambiando
      if (data.correo !== undefined && data.correo !== usuario.correo) {
        const existeCorreo = await this.usuarioRepository.findOne({
          where: { correo: data.correo, id: Not(id) }
        });
        if (existeCorreo) {
          throw new BadRequestException(`El correo '${data.correo}' ya está registrado.`);
        }
      }
  
      if (data.password) {
        const salt = await bcrypt.genSalt(10);
        usuario.passwordHash = await bcrypt.hash(data.password, salt);
        delete data.password;
      }

      if (data.tipoUsuario) {
        // Validar que no se cambie a rol admin si ya existe uno
        const nuevoRol = await this.tipoUsuarioRepository.findOne({ where: { id: data.tipoUsuario } });
        if (nuevoRol && nuevoRol.nombre.toLowerCase() === 'admin') {
          const adminExistente = await this.usuarioRepository.findOne({
            where: { tipoUsuario: { nombre: 'Admin' } },
            relations: ['tipoUsuario']
          });
          if (adminExistente && adminExistente.id !== id) {
            throw new BadRequestException('Ya existe un administrador. No se puede asignar este rol.');
          }
        }
        usuario.tipoUsuario = { id: data.tipoUsuario } as any;
      }

      // Si el rol cambió y ya no es aprendiz ni pasante, quitar la ficha automáticamente
      if (data.tipoUsuario) {
        const nuevoRol = await this.tipoUsuarioRepository.findOne({ where: { id: data.tipoUsuario } });
        if (nuevoRol && nuevoRol.nombre.toLowerCase() !== 'aprendiz' && nuevoRol.nombre.toLowerCase() !== 'pasante') {
          usuario.ficha = null as any;
          console.log(`Ficha removida automáticamente para usuario ${usuario.nombre} - nuevo rol: ${nuevoRol.nombre}`);
        }
      }

      // Si el rol cambió, actualizar los permisos del usuario
      if (data.tipoUsuario) {
        // Los permisos se actualizan automáticamente en el token cuando el usuario haga login nuevamente
        // o cuando se refresque la aplicación, ya que el JWT contiene los permisos del rol actual
        console.log(`Rol actualizado para usuario ${usuario.nombre} - nuevo rol ID: ${data.tipoUsuario}`);
      }

      // Manejar actualización de ficha
      if (data.id_ficha !== undefined) {
        if (data.id_ficha) {
          // Si se proporciona id_ficha, validar que exista
          const ficha = await this.fichaRepository.findOne({ where: { id_ficha: data.id_ficha } });
          if (!ficha) {
            throw new BadRequestException(`La ficha con id_ficha ${data.id_ficha} no existe`);
          }
          usuario.ficha = ficha;
        } else {
          // Si se envía vacío, quitar la ficha
          usuario.ficha = null as any;
        }
        delete data.id_ficha; // Remover del data para no interferir con Object.assign
      }

      Object.assign(usuario, data);

      return await this.usuarioRepository.save(usuario);
    }

  async eliminar(id: number): Promise<void> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    usuario.estado = false;
    await this.usuarioRepository.save(usuario);
  }

  async reactivar(id: number): Promise<void> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    usuario.estado = true;
    await this.usuarioRepository.save(usuario);
  }

  async deleteUsuario(id: number): Promise<void> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    await this.usuarioRepository.delete(id);
  }

  async findByIdentificacion(identificacion: string | number) {
    return this.usuarioRepository.findOne({
      where: { identificacion: Number(identificacion) as any },
      relations: [
        'tipoUsuario',
        'tipoUsuario.rolPermisos',
        'tipoUsuario.rolPermisos.permiso',
        'tipoUsuario.rolPermisos.permiso.modulo', 
        'usuarioPermisos',
        'usuarioPermisos.permiso',
        'usuarioPermisos.permiso.modulo', 
      ],
    });
  }




  // crear usuario


  async crear(data: CreateUsuarioDto): Promise<Usuario> {
    const { tipoUsuario, password, id_ficha, ...resto } = data;

    // Validar unicidad de identificación
    const existeIdentificacion = await this.usuarioRepository.findOne({
      where: { identificacion: data.identificacion }
    });
    if (existeIdentificacion) {
      throw new BadRequestException(`La identificación '${data.identificacion}' ya está registrada.`);
    }

    // Validar unicidad de correo
    const existeCorreo = await this.usuarioRepository.findOne({
      where: { correo: data.correo }
    });
    if (existeCorreo) {
      throw new BadRequestException(`El correo '${data.correo}' ya está registrado.`);
    }

    // Validar que no se cree más de un administrador
    const rol = await this.tipoUsuarioRepository.findOne({ where: { id: tipoUsuario } });
    if (rol && rol.nombre.toLowerCase() === 'admin') {
      const adminExistente = await this.usuarioRepository.findOne({
        where: { tipoUsuario: { nombre: 'Admin' } },
        relations: ['tipoUsuario']
      });
      if (adminExistente) {
        throw new BadRequestException('Ya existe un administrador. No se puede crear otro.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let ficha: Ficha | undefined = undefined;
    if (id_ficha) {
      // Validar que la ficha existe si se proporciona
      const fichaEncontrada = await this.fichaRepository.findOne({ where: { id_ficha } });
      if (!fichaEncontrada) {
        throw new BadRequestException(`La ficha con id_ficha ${id_ficha} no existe`);
      }
      ficha = fichaEncontrada;
    }

    const nuevo = this.usuarioRepository.create({
      ...resto,
      passwordHash: hashedPassword,
      tipoUsuario: { id: tipoUsuario },
      ...(ficha && { ficha }),
    });

    return await this.usuarioRepository.save(nuevo);
  }


 // recuperacion password
  async solicitarRecuperacion(identificacion: string | number) {
    const idNum = Number(identificacion);
    if (Number.isNaN(idNum)) throw new BadRequestException('Identificación inválida');

    const usuario = await this.usuarioRepository.findOne({
      where: { identificacion: idNum },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    usuario.resetToken = token;
    usuario.resetExpira = new Date(Date.now() + 60 * 60 * 1000); // expira en 1 hora

    await this.usuarioRepository.save(usuario);

    // URL que llegará al correo (frontend maneja esta ruta)
    const url = `${process.env.FRONTEND_URL}/restablecer?token=${token}`;
    await this.correoService.enviarLink(usuario.correo, url);

    return { success: true, message: 'Se ha enviado un link de recuperación al correo',
      correo: usuario.correo
     };
  }

  async restablecerPassword(token: string, nueva: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { resetToken: token },
    });

    if (!usuario) throw new BadRequestException('Token inválido');
    if (!usuario.resetExpira || usuario.resetExpira < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    usuario.passwordHash = await bcrypt.hash(nueva, salt);

    usuario.resetToken = null;
    usuario.resetExpira = null;

    await this.usuarioRepository.save(usuario);

    return { success: true, message: 'Contraseña actualizada correctamente' };
  }

  async verificarToken(token: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { resetToken: token },
    });

    if (!usuario) throw new BadRequestException('Token inválido');
    if (!usuario.resetExpira || usuario.resetExpira < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    return {
      valid: true,
      identificacion: usuario.identificacion,
      correo: usuario.correo,
    };
  }



  //cambiar password ya logueado 

  async cambiarPassword(id: number, actual: string, nueva: string) {
  const usuario = await this.usuarioRepository.findOne({ where: { id } });
  if (!usuario) throw new NotFoundException('Usuario no encontrado');

  // Comparar contraseña actual
  const match = await bcrypt.compare(actual, usuario.passwordHash);
  if (!match) {
    throw new BadRequestException('La contraseña actual es incorrecta');
  }

  // Generar nuevo hash
  const salt = await bcrypt.genSalt(10);
  usuario.passwordHash = await bcrypt.hash(nueva, salt);

  await this.usuarioRepository.save(usuario);

  return { success: true, message: 'Contraseña actualizada correctamente' };
}


// editar perfil logueado
async actualizarPerfil(id: number, data: UpdatePerfilDto): Promise<Usuario> {
  const usuario = await this.usuarioRepository.findOne({ where: { id } });
  if (!usuario) throw new NotFoundException('Usuario no encontrado');

  // Validar unicidad de identificación si se está cambiando
  if (data.identificacion !== undefined && data.identificacion !== usuario.identificacion) {
    const existeIdentificacion = await this.usuarioRepository.findOne({
      where: { identificacion: data.identificacion, id: Not(usuario.id) }
    });
    if (existeIdentificacion) {
      throw new BadRequestException(`La identificación '${data.identificacion}' ya está registrada.`);
    }
  }

  // Validar unicidad de correo si se está cambiando
  if (data.correo !== undefined && data.correo !== usuario.correo) {
    const existeCorreo = await this.usuarioRepository.findOne({
      where: { correo: data.correo, id: Not(usuario.id) }
    });
    if (existeCorreo) {
      throw new BadRequestException(`El correo '${data.correo}' ya está registrado.`);
    }
  }

  // solo datos basicos
  if (data.tipoIdentificacion !== undefined) usuario.Tipo_Identificacion = data.tipoIdentificacion;
  if (data.identificacion !== undefined) usuario.identificacion = data.identificacion;
  if (data.nombres !== undefined) usuario.nombre = data.nombres;
  if (data.apellidos !== undefined) usuario.apellidos = data.apellidos;
  if (data.correo !== undefined) usuario.correo = data.correo;
  if (data.telefono !== undefined) usuario.telefono = data.telefono;

  return await this.usuarioRepository.save(usuario);
}

//fotoperfil

async updateProfilePic(userId: number, filename: string) {
  const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });

  if (!usuario) {
    throw new NotFoundException('Usuario no encontrado');
  }

  usuario.foto = filename; // en tu entidad debe existir el campo `foto`

  await this.usuarioRepository.save(usuario);

  return {
    success: true,
    message: 'Foto de perfil actualizada correctamente',
    foto: filename,
  };
}

//foto perfil ver
async getProfilePic(userId: number, res: Response) {
  const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });

  if (!usuario || !usuario.foto) {
    throw new NotFoundException('Foto de perfil no encontrada');
  }

  const imagePath = join(process.cwd(), 'uploads', 'profile-pic', usuario.foto);

  return res.sendFile(imagePath);
}

}
