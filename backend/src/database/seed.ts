
import { AppDataSource } from '../../typeorm.config';
import { TipoUsuario } from '../modules/tipo_usuario/entities/tipo_usuario.entity';
import { Modulo } from '../modules/modulos/entities/modulo.entity';
import { Permiso } from '../modules/permisos/entities/permiso.entity';
import { RolPermiso } from '../modules/rol_permiso/entities/rol_permiso.entity';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Iniciando el seeder de permisos y roles...');

  const tipoUsuarioRepo = AppDataSource.getRepository(TipoUsuario);
  const roleDefinitions = [
    { nombre: 'Admin', descripcion: 'Administrador total' },
    { nombre: 'Instructor', descripcion: 'Instructor' },
    { nombre: 'Aprendiz', descripcion: 'Aprendiz' },
    { nombre: 'Pasante', descripcion: 'Pasante' },
    { nombre: 'Invitado', descripcion: 'Invitado' },
  ];

  const roles: Record<string, TipoUsuario> = {};
  for (const def of roleDefinitions) {
    let role = await tipoUsuarioRepo.findOne({ where: { nombre: def.nombre } });
    if (!role) {
      console.log(`  - Creando rol: ${def.nombre}`);
      role = await tipoUsuarioRepo.save(def);
    }
    roles[def.nombre.toLowerCase()] = role;
  }

  const moduloRepo = AppDataSource.getRepository(Modulo);
  const modulosDef = [
    { nombre: 'Usuarios', descripcion: 'Gestión de usuarios y accesos' },
    { nombre: 'Iot', descripcion: 'Sensores y dispositivos' },
    { nombre: 'Inventario', descripcion: 'Materiales, movimientos y stock' },
    { nombre: 'Actividades', descripcion: 'Gestión de actividades' },
    { nombre: 'Finanzas', descripcion: 'Pagos y contabilidad' },
    { nombre: 'Fitosanitario', descripcion: 'Evaluaciones EPA' },
    { nombre: 'Cultivo', descripcion: 'Lotes, cultivos y producción' },
  ];

  const modulos: Record<string, Modulo> = {};
  for (const m of modulosDef) {
    let mod = await moduloRepo.findOne({ where: { nombre: m.nombre } });
    if (!mod) {
      console.log(`  - Creando módulo: ${m.nombre}`);
      mod = await moduloRepo.save(m);
    }
    modulos[m.nombre] = mod;
  }

  const permisosRepo = AppDataSource.getRepository(Permiso);
  const permisosDef = [
    { nombre: 'Usuarios.Ver', modulo: 'Usuarios' },
    { nombre: 'Usuarios.Crear', modulo: 'Usuarios' },
    { nombre: 'Usuarios.Editar', modulo: 'Usuarios' },
    { nombre: 'Usuarios.Desactivar', modulo: 'Usuarios' },
    { nombre: 'Usuarios.Asignar', modulo: 'Usuarios' },
    { nombre: 'Usuarios.DescargarExcel', modulo: 'Usuarios' },
    { nombre: 'Usuarios.EliminarFichas', modulo: 'Usuarios' },
    { nombre: 'Usuarios.EliminarRol', modulo: 'Usuarios' },

    { nombre: 'Iot.Ver', modulo: 'Iot' },
    { nombre: 'Iot.Crear', modulo: 'Iot' },
    { nombre: 'Iot.Editar', modulo: 'Iot' },
    { nombre: 'Iot.Eliminar', modulo: 'Iot' },
    { nombre: 'Iot.DescargarPdf', modulo: 'Iot' },

    { nombre: 'Inventario.Ver', modulo: 'Inventario' },
    { nombre: 'Inventario.Crear', modulo: 'Inventario' },
    { nombre: 'Inventario.Editar', modulo: 'Inventario' },
    { nombre: 'Inventario.ActualizarStock', modulo: 'Inventario' },
    { nombre: 'Finanzas.Ver', modulo: 'Finanzas' },
    { nombre: 'Finanzas.VerMovimientos', modulo: 'Finanzas' },
    { nombre: 'Finanzas.Crear', modulo: 'Finanzas' },
    { nombre: 'Finanzas.Editar', modulo: 'Finanzas' },
    { nombre: 'Finanzas.Eliminar', modulo: 'Finanzas' },
    { nombre: 'Finanzas.Exportar', modulo: 'Finanzas' },

    { nombre: 'Fitosanitario.Ver', modulo: 'Fitosanitario' },
    { nombre: 'Fitosanitario.Crear', modulo: 'Fitosanitario' },
    { nombre: 'Fitosanitario.Editar', modulo: 'Fitosanitario' },
    { nombre: 'Fitosanitario.Eliminar', modulo: 'Fitosanitario' },
    { nombre: 'Fitosanitario.Actualizar', modulo: 'Fitosanitario' },

    { nombre: 'Cultivo.Ver', modulo: 'Cultivo' },
    { nombre: 'Cultivo.Crear', modulo: 'Cultivo' },
    { nombre: 'Cultivo.Editar', modulo: 'Cultivo' },
    { nombre: 'Cultivo.EliminarSublote', modulo: 'Cultivo' },
    { nombre: 'Cultivo.RegistraryVerCosecha', modulo: 'Cultivo' },
    { nombre: 'Cultivo.VerTrazabilidad', modulo: 'Cultivo' },
    { nombre: 'Cultivo.DescargarTrazabilidad', modulo: 'Cultivo' },

    { nombre: 'Actividades.Ver', modulo: 'Actividades' },
    { nombre: 'Actividades.Editar', modulo: 'Actividades' },
    { nombre: 'Actividades.Eliminar', modulo: 'Actividades' },
    { nombre: 'Actividades.Asignar', modulo: 'Actividades' },
    { nombre: 'Actividades.Responder', modulo: 'Actividades' },
    { nombre: 'Actividades.Pagar', modulo: 'Actividades' },
    { nombre: 'Actividades.VerPagos', modulo: 'Actividades' },
  ];

  const permisosMap = new Map<string, Permiso>();

  for (const p of permisosDef) {
    let perm = await permisosRepo.findOne({ where: { nombre: p.nombre } });
    if (!perm) {
      console.log(`  - Creando permiso: ${p.nombre}`);
      perm = await permisosRepo.save({
        nombre: p.nombre,
        descripcion: `Permiso para ${p.nombre}`,
        modulo: modulos[p.modulo],
      });
    } else {
      if (!perm.modulo) {
        console.log(`  - Permiso ${p.nombre} no tiene módulo asignado, asignando ${p.modulo}`);
        perm.modulo = modulos[p.modulo];
        perm = await permisosRepo.save(perm);
      } else if (perm.modulo.nombre !== p.modulo) {
        console.log(`  - Actualizando módulo de permiso ${p.nombre}: ${perm.modulo.nombre} -> ${p.modulo}`);
        perm.modulo = modulos[p.modulo];
        perm = await permisosRepo.save(perm);
      }
    }
    permisosMap.set(p.nombre, perm);
  }

  const rolPermisoRepo = AppDataSource.getRepository(RolPermiso);
  const existingRolPermisos = await rolPermisoRepo.find({ relations: ['tipoUsuario', 'permiso'] });
  const rolPermisosSet = new Set(existingRolPermisos.map(rp => `${rp.tipoUsuario.id}-${rp.permiso.id}`));

  const assign = async (roleObj: TipoUsuario, permNames: string[]) => {
    for (const name of permNames) {
      const perm = permisosMap.get(name);
      if (!perm) {
        console.warn(`Permiso no encontrado: ${name}`);
        continue;
      }
      const key = `${roleObj.id}-${perm.id}`;
      if (!rolPermisosSet.has(key)) {
        console.log(`  -> Asignando ${name} a ${roleObj.nombre}`);
        await rolPermisoRepo.save({ tipoUsuario: roleObj, permiso: perm });
        rolPermisosSet.add(key);
      }
    }
  };

  const allPerms = Array.from(permisosMap.keys());

  await assign(roles.admin, allPerms);

  const instructorPerms = allPerms.filter(perm =>
    !perm.includes('.Eliminar') ||
    perm === 'Actividades.Eliminar' ||
    perm === 'Cultivo.EliminarSublote'
  );
  await assign(roles.instructor, instructorPerms);

  const aprendizPerms = [
    'Actividades.Ver',
    'Actividades.Responder',
    'Cultivo.Ver',
    'Cultivo.RegistraryVerCosecha',
    'Cultivo.VerTrazabilidad',
    'Inventario.Ver',
    'Iot.Ver',
    'Finanzas.Ver',
    'Finanzas.Crear',
    'Finanzas.Editar',
    'Fitosanitario.Ver'
  ];
  await assign(roles.aprendiz, aprendizPerms);

  const pasantePerms = [
    ...aprendizPerms,
    'Actividades.VerPagos'
  ];
  await assign(roles.pasante, pasantePerms);

  await assign(roles.invitado, []);

  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const adminEmail = process.env.ADMIN_EMAIL || 'todossomosagrotech@gmail.com';
  let adminUser = await usuarioRepo.findOne({ where: { correo: adminEmail } });

  if (!adminUser) {
    console.log('  - Creando Super Admin...');
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || '@dmin123', 10);
    await usuarioRepo.save({
      Tipo_Identificacion: process.env.ADMIN_TIPO_IDENTIFICACION || 'CC',
      identificacion: Number(process.env.ADMIN_IDENTIFICACION) || 1000000000,
      nombre: process.env.ADMIN_NOMBRE || 'Super',
      apellidos: process.env.ADMIN_APELLIDOS || 'Admin',
      telefono: process.env.ADMIN_TELEFONO || '0000000000',
      correo: adminEmail,
      passwordHash: hash,
      tipoUsuario: roles.admin,
      estado: true
    });
  }



  console.log('✅ Seed completado.');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Error en seed:', error);
  AppDataSource.destroy();
});
