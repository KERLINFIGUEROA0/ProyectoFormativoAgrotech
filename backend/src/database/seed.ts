
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

  // 1. Roles
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

  // 2. Módulos
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

  // 3. Permisos
  const permisosRepo = AppDataSource.getRepository(Permiso);
  const permisosDef = [
    // Usuarios
    { nombre: 'Usuarios.Ver', modulo: 'Usuarios' },
    { nombre: 'Usuarios.Crear', modulo: 'Usuarios' },
    { nombre: 'Usuarios.Editar', modulo: 'Usuarios' },
    { nombre: 'Usuarios.Desactivar', modulo: 'Usuarios' },
    { nombre: 'Usuarios.Asignar', modulo: 'Usuarios' },
    { nombre: 'Usuarios.DescargarExcel', modulo: 'Usuarios' },
    { nombre: 'Usuarios.EliminarFichas', modulo: 'Usuarios' }, // Added based on context
    { nombre: 'Usuarios.EliminarRol', modulo: 'Usuarios' }, // Added based on context

    // Iot - Permisos unificados para todo el módulo IoT (sensores, brokers, información de sensores)
    { nombre: 'Iot.Ver', modulo: 'Iot' },
    { nombre: 'Iot.Crear', modulo: 'Iot' },
    { nombre: 'Iot.Editar', modulo: 'Iot' },
    { nombre: 'Iot.Eliminar', modulo: 'Iot' },
    { nombre: 'Iot.DescargarPdf', modulo: 'Iot' },

    // Inventario - Permisos unificados para todo el módulo Inventario (materiales, movimientos, stock)
    { nombre: 'Inventario.Ver', modulo: 'Inventario' },
    { nombre: 'Inventario.Crear', modulo: 'Inventario' },
    { nombre: 'Inventario.Editar', modulo: 'Inventario' },
    { nombre: 'Inventario.ActualizarStock', modulo: 'Inventario' },

    // Finanzas - Permisos unificados con acceso limitado inteligente
    { nombre: 'Finanzas.Ver', modulo: 'Finanzas' }, // Ver transacciones + acceso a cosechas/materiales disponibles
    { nombre: 'Finanzas.VerMovimientos', modulo: 'Finanzas' }, // Ver movimientos recientes en dashboard
    { nombre: 'Finanzas.Crear', modulo: 'Finanzas' }, // Crear ventas y gastos
    { nombre: 'Finanzas.Editar', modulo: 'Finanzas' }, // Editar transacciones existentes
    { nombre: 'Finanzas.Eliminar', modulo: 'Finanzas' }, // Eliminar transacciones
    { nombre: 'Finanzas.Exportar', modulo: 'Finanzas' }, // Exportar datos

    // Fitosanitario - Permisos unificados para todo el módulo Fitosanitario (EPA, tratamientos, evaluaciones)
    { nombre: 'Fitosanitario.Ver', modulo: 'Fitosanitario' },
    { nombre: 'Fitosanitario.Crear', modulo: 'Fitosanitario' },
    { nombre: 'Fitosanitario.Editar', modulo: 'Fitosanitario' },
    { nombre: 'Fitosanitario.Eliminar', modulo: 'Fitosanitario' },
    { nombre: 'Fitosanitario.Actualizar', modulo: 'Fitosanitario' },

    // Cultivo - Permisos unificados para todo el módulo (cultivos, lotes, sublotes, tipos de cultivo)
    { nombre: 'Cultivo.Ver', modulo: 'Cultivo' },
    { nombre: 'Cultivo.Crear', modulo: 'Cultivo' },
    { nombre: 'Cultivo.Editar', modulo: 'Cultivo' },
    { nombre: 'Cultivo.EliminarSublote', modulo: 'Cultivo' },
    { nombre: 'Cultivo.RegistraryVerCosecha', modulo: 'Cultivo' },
    { nombre: 'Cultivo.VerTrazabilidad', modulo: 'Cultivo' },
    { nombre: 'Cultivo.DescargarTrazabilidad', modulo: 'Cultivo' },

    // Actividades - Permisos para gestión de actividades
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
      // Verificar si el permiso tiene módulo asignado
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

  // 4. Asignar Permisos a Roles
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

  // ==========================================
  // ASIGNACIÓN DE PERMISOS POR ROL SEGÚN JERARQUÍA DEFINIDA
  // ==========================================

  // FLUJO DE PERMISOS:
  // - Admin: Control total del sistema
  // - Instructor: Casi todo, pero NO puede eliminar (excepto actividades)
  // - Aprendiz: Solo visualización y operaciones básicas
  // - Pasante: Todo lo del aprendiz + ver pagos
  // - Invitado: Solo acceso al dashboard/home

  // Admin: TIENE TODOS LOS PERMISOS
  await assign(roles.admin, allPerms);

  // Instructor: TIENE TODOS LOS PERMISOS EXCEPTO ELIMINAR (a menos que se active específicamente)
  // El instructor NO puede eliminar usuarios, materiales, cultivos, etc. Solo actividades.
  const instructorPerms = allPerms.filter(perm =>
    !perm.includes('.Eliminar') ||
    perm === 'Actividades.Eliminar' || // Instructor puede eliminar actividades que asignó
    perm === 'Cultivo.EliminarSublote'  // Instructor puede eliminar sublotes
  );
  await assign(roles.instructor, instructorPerms);

  // Aprendiz: PERMISOS DE SOLO LECTURA Y OPERACIONES BÁSICAS
  // - Puede visualizar lotes
  // - Puede visualizar todo lo relacionado con cultivos
  // - Puede visualizar cosechas
  // - Puede visualizar inventario
  // - Puede visualizar actividades y responderlas
  // - Puede visualizar Fitosanitario
  const aprendizPerms = [
    // Actividades - Solo ver y responder
    'Actividades.Ver',
    'Actividades.Responder',

    // Cultivo - Todo lo relacionado con visualización
    'Cultivo.Ver', // Visualizar lotes y cultivos
    'Cultivo.RegistraryVerCosecha', // Visualizar cosechas
    'Cultivo.VerTrazabilidad', // Visualizar trazabilidad

    // Inventario - Solo visualización
    'Inventario.Ver',

    // IoT - Solo visualización básica
    'Iot.Ver',

    // Finanzas - Operaciones básicas pero NO eliminar ni ver movimientos en dashboard
    'Finanzas.Ver',
    'Finanzas.Crear',
    'Finanzas.Editar',
    // NOTA: Aprendices NO tienen Finanzas.Eliminar ni Finanzas.VerMovimientos

    // Fitosanitario - Solo visualización
    'Fitosanitario.Ver'
  ];
  await assign(roles.aprendiz, aprendizPerms);

  // Pasante: TODO LO QUE PUEDE HACER UN APRENDIZ + RECIBIR PAGOS DEL INSTRUCTOR
  // - Hereda todos los permisos del aprendiz
  // - Adicionalmente puede recibir pagos del instructor
  const pasantePerms = [
    ...aprendizPerms,
    'Actividades.VerPagos' // Los pasantes pueden ver y recibir sus pagos del instructor
  ];
  await assign(roles.pasante, pasantePerms);

  // Invitado: SOLO PUEDE VISUALIZAR EL INICIO/HOME
  // - No tiene permisos específicos asignados
  // - Solo acceso básico autenticado al dashboard
  // - Puede ver las estadísticas públicas del home pero no acceder a módulos específicos

  // 5. Usuario Admin Default
  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
  let adminUser = await usuarioRepo.findOne({ where: { correo: adminEmail } });

  if (!adminUser) {
    console.log('  - Creando Super Admin...');
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || '@dmin123', 10);
    await usuarioRepo.save({
      Tipo_Identificacion: process.env.ADMIN_TIPO_IDENTIFICACION || 'CC',
      identificacion: Number(process.env.ADMIN_IDENTIFICACION) || 1000000000, // Updated ID to match user request
      nombre: process.env.ADMIN_NOMBRE || 'Super',
      apellidos: process.env.ADMIN_APELLIDOS || 'Admin',
      telefono: process.env.ADMIN_TELEFONO || '0000000000',
      correo: adminEmail,
      passwordHash: hash,
      tipoUsuario: roles.admin,
      estado: true
    });
  }

  // ==========================================
  // RESUMEN DE PERMISOS POR ROL
  // ==========================================
  /*
  ┌─────────────┬─────────┬────────────┬────────────┬────────────┬────────────┐
  │   MÓDULO    │  ADMIN  │ INSTRUCTOR │ APRENDIZ   │  PASANTE   │  INVITADO  │
  ├─────────────┼─────────┼────────────┼────────────┼────────────┼────────────┤
  │ Usuarios    │   TODO  │    TODO    │     ❌     │     ❌     │     ❌     │
  │ IoT         │   TODO  │    TODO    │    VER     │    VER     │     ❌     │
  │ Inventario  │   TODO  │    TODO    │    VER     │    VER     │     ❌     │
  │ Actividades │   TODO  │    TODO    │ VER+RESP  │ VER+RESP+  │     ❌     │
  │             │         │            │            │ VER PAGOS  │            │
  │ Finanzas    │   TODO  │    TODO    │ VER+CREAR+│ VER+CREAR+ │     ❌     │
  │             │         │            │ EDITAR     │ EDITAR     │            │
  │ Fitosanit.  │   TODO  │    TODO    │    VER     │    VER     │     ❌     │
  │ Cultivo     │   TODO  │    TODO    │    VER     │    VER     │     ❌     │
  │ Dashboard   │   TODO  │    TODO    │    TODO    │    TODO    │    HOME    │
  │ Eliminar    │   TODO  │ ACTIVIDADES│     ❌     │     ❌     │     ❌     │
  │             │         │ +SUBLOTES  │            │            │            │
  └─────────────┴─────────┴────────────┴────────────┴────────────┴────────────┘

  NOTAS IMPORTANTES:
  - Instructor: NO puede eliminar usuarios, materiales, cultivos, etc.
  - Aprendiz: NO puede eliminar nada, NO ve movimientos financieros en dashboard
  - Pasante: Hereda todo del aprendiz + puede ver sus pagos
  - Invitado: Solo ve el dashboard/home con estadísticas públicas
  - Dashboard: Estadísticas visibles para todos, movimientos solo para Admin/Instructor
  */

  console.log('✅ Seed completado.');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Error en seed:', error);
  AppDataSource.destroy();
});
