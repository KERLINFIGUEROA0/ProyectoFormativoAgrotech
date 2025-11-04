import 'reflect-metadata';
import { AppDataSource } from '../../typeorm.config';
import { TipoUsuario } from '../modules/tipo_usuario/entities/tipo_usuario.entity';
import { Modulo } from '../modules/modulos/entities/modulo.entity';
import { Permiso } from '../modules/permisos/entities/permiso.entity';
import { RolPermiso } from '../modules/rol_permiso/entities/rol_permiso.entity';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Iniciando el seeder...');

  // 1. Crear/Verificar Roles (sin cambios)
  console.log('Verificando y creando roles...');
  const tipoUsuarioRepo = AppDataSource.getRepository(TipoUsuario);
  const roleDefinitions = [
    { nombre: 'Admin', descripcion: 'Administrador con todos los permisos' },
    { nombre: 'Pasante', descripcion: 'Rol pasante' },
    { nombre: 'Instructor', descripcion: 'Rol instructor' },
    { nombre: 'Invitado', descripcion: 'Rol invitado' },
    { nombre: 'Aprendiz', descripcion: 'Rol aprendiz' },
  ];
  const existingRoles = await tipoUsuarioRepo.find();
  const existingRolesMap = new Map(existingRoles.map((r) => [r.nombre, r]));
  const roles: Record<string, TipoUsuario> = {};

  for (const def of roleDefinitions) {
    const roleKey = def.nombre.toLowerCase();
    if (existingRolesMap.has(def.nombre)) {
      roles[roleKey] = existingRolesMap.get(def.nombre)!;
    } else {
      console.log(`  - Creando nuevo rol: ${def.nombre}`);
      const newRole = await tipoUsuarioRepo.save(def);
      roles[roleKey] = newRole;
    }
  }
  console.log('Roles verificados.');

  // 2. Crear/Verificar Módulos (sin cambios)
  console.log('Verificando y creando módulos...');
  const moduloRepo = AppDataSource.getRepository(Modulo);
  const moduleDefinitions = [
    { nombre: 'Perfil', descripcion: 'Gestión del perfil del usuario' },
    { nombre: 'Usuarios', descripcion: 'Gestión de usuarios' },
    { nombre: 'Iot', descripcion: 'Gestión de dispositivos IoT' },
    { nombre: 'Finanzas', descripcion: 'Gestión financiera' },
    { nombre: 'Fitosanitario', descripcion: 'Gestión fitosanitaria' },
    { nombre: 'Inventario', descripcion: 'Gestión de inventario' },
    { nombre: 'Actividades', descripcion: 'Gestión de actividades' },
    { nombre: 'Inicio', descripcion: 'Pantalla inicial / Dashboard' },
    { nombre: 'Cultivos', descripcion: 'Gestión de cultivos' },
  ];
  const existingModules = await moduloRepo.find();
  const existingModulesMap = new Map(existingModules.map((m) => [m.nombre, m]));
  const modulos: Modulo[] = [];
  const modulosByName: Record<string, Modulo> = {};

  for (const def of moduleDefinitions) {
    let newModule: Modulo;
    if (existingModulesMap.has(def.nombre)) {
      newModule = existingModulesMap.get(def.nombre)!;
    } else {
      console.log(`  - Creando nuevo módulo: ${def.nombre}`);
      newModule = await moduloRepo.save(def);
    }
    modulos.push(newModule);
    modulosByName[def.nombre] = newModule;
  }
  console.log('Módulos verificados.');

  // 3. Crear/Verificar Permisos (con ajustes)
  console.log('Verificando y creando permisos...');
  const permisosRepo = AppDataSource.getRepository(Permiso);
  const allPermissions = await permisosRepo.find();
  const permissionsMap = new Map(allPermissions.map((p) => [p.nombre, p]));
  const permissionsToCreate: Partial<Permiso>[] = [];

  // Permisos CRUD estándar
  for (const modulo of modulos) {
    const acciones = ['Crear', 'Ver', 'Editar', 'Eliminar'];
    for (const accion of acciones) {
      const nombre = `${modulo.nombre}.${accion}`;
      if (!permissionsMap.has(nombre)) {
        permissionsToCreate.push({
          nombre,
          descripcion: `Puede ${accion.toLowerCase()} en ${modulo.nombre}`,
          modulo,
        });
      }
    }
  }

  // Permisos específicos para Perfil
  const permisosPerfil = [
    {
      nombre: 'Perfil.Editar',
      descripcion: 'Permite editar la información del perfil del usuario',
      modulo: modulosByName['Perfil'],
    },
    {
      nombre: 'Perfil.Foto',
      descripcion: 'Permite subir y actualizar la foto de perfil',
      modulo: modulosByName['Perfil'],
    },
  ];

  for (const perm of permisosPerfil) {
    if (!permissionsMap.has(perm.nombre)) {
      permissionsToCreate.push(perm);
    }
  }

  // Permisos específicos que no son CRUD
  const permisosEspecificos = [
    {
      nombre: 'Usuarios.Asignar',
      descripcion: 'Permite asignar o quitar permisos a un rol o usuario.',
      modulo: modulosByName['Usuarios'], // Asignado al módulo 'Usuarios'
    },
    {
      nombre: 'Usuarios.VerPermisos',
      descripcion: 'Permite ver la lista de permisos de un rol o usuario.',
      modulo: modulosByName['Usuarios'], // Asignado al módulo 'Usuarios'
    },
  ];

  for (const perm of permisosEspecificos) {
    if (!permissionsMap.has(perm.nombre)) {
      permissionsToCreate.push(perm);
    }
  }

  if (permissionsToCreate.length > 0) {
    console.log(`  - Creando ${permissionsToCreate.length} nuevos permisos...`);
    const newPermissions = await permisosRepo.save(permissionsToCreate);
    newPermissions.forEach((p) => permissionsMap.set(p.nombre, p));
  }
  console.log('Permisos verificados.');

  // 4. Asignar todos los permisos al Admin (sin cambios, el código ya lo hace)
  console.log('Verificando y asignando permisos a roles...');
  const rolPermisoRepo = AppDataSource.getRepository(RolPermiso);
  const existingRolPermisos = await rolPermisoRepo.find({ relations: ['tipoUsuario', 'permiso'] });
  const existingRolPermisosSet = new Set(
    existingRolPermisos.map((rp) => `${rp.tipoUsuario.id}-${rp.permiso.id}`),
  );
  const rolPermisosToCreate: Partial<RolPermiso>[] = [];

  // Admin -> todos los permisos
  for (const permiso of permissionsMap.values()) {
    const key = `${roles.admin.id}-${permiso.id}`;
    if (!existingRolPermisosSet.has(key)) {
      rolPermisosToCreate.push({
        tipoUsuario: roles.admin,
        permiso,
      });
    }
  }

  // ... (código para asignar permisos a otros roles, sin cambios)
      const assignPermissions = (role: TipoUsuario, permissionNames: string[]) => {
    for (const nombre of permissionNames) {
      if (permissionsMap.has(nombre)) {
        const permiso = permissionsMap.get(nombre)!;
        const key = `${role.id}-${permiso.id}`;
        if (!existingRolPermisosSet.has(key)) {
          rolPermisosToCreate.push({
            tipoUsuario: role,
            permiso: permiso,
            // estado: true, <-- SE ELIMINA ESTA LÍNEA
          });
        }
      } else {
        console.warn(
          `  - ADVERTENCIA: El permiso "${nombre}" no fue encontrado y no será asignado.`,
        );
      }
    }
  };

  // ... (código de asignación para otros roles sin cambios, ya usan la función `assignPermissions` corregida)
    const permisosInstructor = [
    'Usuarios.Crear',
    'Usuarios.Ver',
    'Actividades.Crear',
    'Actividades.Ver',
    'Actividades.Editar',
    'Actividades.Eliminar',
    'Cultivos.Crear',
    'Cultivos.Ver',
    'Cultivos.Editar',
    'Cultivos.Eliminar',
    'Perfil.Ver',
    'Perfil.Editar',
    'Inicio.Ver',
  ];
  assignPermissions(roles.instructor, permisosInstructor);

  // Pasante -> puede ver en casi todos los módulos, y crear en actividades
  const permisosPasante = [
    'Actividades.Crear',
    'Actividades.Ver',
    'Perfil.Ver',
    'Perfil.Editar',
    'Perfil.Foto',
    'Usuarios.Ver',
    'Iot.Ver',
    'Finanzas.Ver',
    'Fitosanitario.Ver',
    'Inventario.Ver',
    'Inicio.Ver',
    'Cultivos.Ver',
  ];
  assignPermissions(roles.pasante, permisosPasante);

  // Aprendiz -> solo ver perfil, cultivos y actividades
  const permisosAprendiz = [
    'Perfil.Ver',
    'Perfil.Editar',
    'Perfil.Foto',
    'Cultivos.Ver',
    'Actividades.Ver',
    'Inicio.Ver',
  ];
  assignPermissions(roles.aprendiz, permisosAprendiz);

  // Invitado -> solo ver inicio y perfil
  const permisosInvitado = [
    'Inicio.Ver',
    'Perfil.Ver',
    'Perfil.Editar',
    'Perfil.Foto',
  ];
  assignPermissions(roles.invitado, permisosInvitado);


  if (rolPermisosToCreate.length > 0) {
    console.log(
      `  - Asignando ${rolPermisosToCreate.length} nuevos permisos a roles...`,
    );
    await rolPermisoRepo.save(rolPermisosToCreate);
  }
  console.log('Asignaciones de rol-permiso verificadas.');


  // 5. Crear/Verificar usuario administrador (sin cambios)
  console.log('Verificando usuario administrador...');
  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const existingAdmin = await usuarioRepo.findOne({ where: { correo: adminEmail } });

  if (!existingAdmin) {
    console.log('  - Creando usuario administrador inicial...');
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || '@dmin123', 10);
    await usuarioRepo.save({
      Tipo_Identificacion: process.env.ADMIN_TIPO_IDENTIFICACION,
      identificacion: Number(process.env.ADMIN_IDENTIFICACION),
      nombre: process.env.ADMIN_NOMBRE,
      apellidos: process.env.ADMIN_APELLIDOS,
      telefono: process.env.ADMIN_TELEFONO,
      correo: adminEmail,
      passwordHash,
      tipoUsuario: roles.admin,
      // Nota: El administrador no tiene ficha asignada (ficha: null)
    });
    console.log('  - Usuario administrador creado.');
  } else {
    console.log('  - El usuario administrador ya existe.');
  }
  console.log('Usuario administrador verificado.');

  console.log('✅ Seed ejecutado con éxito');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Error ejecutando el seeder:', error);
  AppDataSource.destroy();
});
