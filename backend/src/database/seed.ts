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
  console.log('🌱 Iniciando el seeder de usuarios...');

  // 1. Crear/Verificar Roles
  console.log('Verificando y creando roles...');
  const tipoUsuarioRepo = AppDataSource.getRepository(TipoUsuario);
  const roleDefinitions = [
    { nombre: 'Admin', descripcion: 'Administrador con todos los permisos' },
    { nombre: 'Instructor', descripcion: 'Rol instructor' },
    { nombre: 'Pasante', descripcion: 'Rol pasante' },
    { nombre: 'Aprendiz', descripcion: 'Rol aprendiz' },
    { nombre: 'Invitado', descripcion: 'Rol invitado' },
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

  // 2. Crear/Verificar Módulo Usuarios
  console.log('Verificando y creando módulo Usuarios...');
  const moduloRepo = AppDataSource.getRepository(Modulo);
  const moduloUsuariosDef = { nombre: 'Usuarios', descripcion: 'Gestión de usuarios' };
  let moduloUsuarios = await moduloRepo.findOne({ where: { nombre: 'Usuarios' } });
  if (!moduloUsuarios) {
    console.log('  - Creando módulo Usuarios');
    moduloUsuarios = await moduloRepo.save(moduloUsuariosDef);
  }
  console.log('Módulo Usuarios verificado.');

  // 2.1. Crear/Verificar Módulo Sensores
  console.log('Verificando y creando módulo Sensores...');
  const moduloSensoresDef = { nombre: 'Sensores', descripcion: 'Gestión de sensores IoT' };
  let moduloSensores = await moduloRepo.findOne({ where: { nombre: 'Sensores' } });
  if (!moduloSensores) {
    console.log('  - Creando módulo Sensores');
    moduloSensores = await moduloRepo.save(moduloSensoresDef);
  }
  console.log('Módulo Sensores verificado.');

  // 3. Crear/Verificar Permisos de Usuarios
  console.log('Verificando y creando permisos de usuarios...');
  const permisosRepo = AppDataSource.getRepository(Permiso);
  const permisosUsuarios = [
    { nombre: 'Usuarios.Crear', descripcion: 'Puede crear usuarios' },
    { nombre: 'Usuarios.Ver', descripcion: 'Puede ver usuarios' },
    { nombre: 'Usuarios.Editar', descripcion: 'Puede editar usuarios' },
    { nombre: 'Usuarios.Desactivar', descripcion: 'Puede desactivar usuarios' },
    { nombre: 'Usuarios.Asignar', descripcion: 'Puede asignar permisos a usuarios' },
    { nombre: 'Usuarios.DescargarExcel', descripcion: 'Puede descargar Excel de usuarios' },
    { nombre: 'Usuarios.EliminarRol', descripcion: 'Puede eliminar roles y usuarios' },
    { nombre: 'Usuarios.EliminarFichas', descripcion: 'Puede eliminar fichas' },
  ];

  const existingPermisos = await permisosRepo.find();
  const permisosMap = new Map(existingPermisos.map((p) => [p.nombre, p]));
  const permisosToCreate: Partial<Permiso>[] = [];

  for (const perm of permisosUsuarios) {
    if (!permisosMap.has(perm.nombre)) {
      permisosToCreate.push({
        ...perm,
        modulo: moduloUsuarios,
      });
    }
  }

  if (permisosToCreate.length > 0) {
    console.log(`  - Creando ${permisosToCreate.length} nuevos permisos...`);
    const newPermisos = await permisosRepo.save(permisosToCreate);
    newPermisos.forEach((p) => permisosMap.set(p.nombre, p));
  }
  console.log('Permisos verificados.');

  // 3.1. Crear/Verificar Permisos de Sensores
  console.log('Verificando y creando permisos de sensores...');
  const permisosSensores = [
    { nombre: 'Sensores.Crear', descripcion: 'Puede crear sensores' },
    { nombre: 'Sensores.Ver', descripcion: 'Puede ver sensores' },
    { nombre: 'Sensores.Editar', descripcion: 'Puede editar sensores' },
    { nombre: 'Sensores.Eliminar', descripcion: 'Puede eliminar sensores' },
  ];

  for (const perm of permisosSensores) {
    if (!permisosMap.has(perm.nombre)) {
      permisosToCreate.push({
        ...perm,
        modulo: moduloSensores,
      });
    }
  }

  if (permisosToCreate.length > 0) {
    console.log(`  - Creando ${permisosToCreate.length} nuevos permisos de sensores...`);
    const newPermisos = await permisosRepo.save(permisosToCreate);
    newPermisos.forEach((p) => permisosMap.set(p.nombre, p));
  }
  console.log('Permisos de sensores verificados.');

  // 4. Asignar permisos a roles
  console.log('Verificando y asignando permisos a roles...');
  const rolPermisoRepo = AppDataSource.getRepository(RolPermiso);
  const existingRolPermisos = await rolPermisoRepo.find({ relations: ['tipoUsuario', 'permiso'] });
  const existingRolPermisosSet = new Set(
    existingRolPermisos.map((rp) => `${rp.tipoUsuario.id}-${rp.permiso.id}`),
  );
  const rolPermisosToCreate: Partial<RolPermiso>[] = [];

  const assignPermissions = (role: TipoUsuario, permissionNames: string[]) => {
    for (const nombre of permissionNames) {
      if (permisosMap.has(nombre)) {
        const permiso = permisosMap.get(nombre)!;
        const key = `${role.id}-${permiso.id}`;
        if (!existingRolPermisosSet.has(key)) {
          rolPermisosToCreate.push({
            tipoUsuario: role,
            permiso,
          });
        }
      } else {
        console.warn(`  - ADVERTENCIA: El permiso "${nombre}" no fue encontrado.`);
      }
    }
  };

  // Admin: Puede realizar todo
  const allPermissions = Array.from(permisosMap.keys());
  assignPermissions(roles.admin, allPermissions);

  // Instructor: Puede realizar todo
  assignPermissions(roles.instructor, allPermissions);

  // Pasante: solo puede ver los aprendices (Usuarios.Ver)
  assignPermissions(roles.pasante, ['']);

  // Aprendiz: No puede ver nada (sin permisos)
  assignPermissions(roles.aprendiz, ['']);


  // Invitado: No puede ver nada (sin permisos)
  assignPermissions(roles.invitado, ['']);


  if (rolPermisosToCreate.length > 0) {
    console.log(`  - Asignando ${rolPermisosToCreate.length} nuevos permisos a roles...`);
    await rolPermisoRepo.save(rolPermisosToCreate);
  }
  console.log('Asignaciones de rol-permiso verificadas.');

  // 5. Crear/Verificar usuario administrador
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
    });
    console.log('  - Usuario administrador creado.');
  } else {
    console.log('  - El usuario administrador ya existe.');
  }
  console.log('Usuario administrador verificado.');

  console.log('✅ Seed de usuarios ejecutado con éxito');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Error ejecutando el seeder:', error);
  AppDataSource.destroy();
});
