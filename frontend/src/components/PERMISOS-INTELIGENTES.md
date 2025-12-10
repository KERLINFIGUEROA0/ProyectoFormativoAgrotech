# Sistema de Permisos Inteligentes

## Nuevos Componentes

### SmartPermissionWrapper
Verifica permisos específicos y también por acción global.

```tsx
<SmartPermissionWrapper module="Usuarios" action="Editar">
  <Button>Editar</Button>
</SmartPermissionWrapper>
```

### ActionPermissionWrapper  
Verifica si tiene una acción en cualquier módulo.

```tsx
<ActionPermissionWrapper action="Crear">
  <Button>Crear</Button>
</ActionPermissionWrapper>
```

## Ejemplo en GestionUsuario.tsx
```tsx
// Botón de editar - se muestra si tiene cualquier permiso "Editar"
<SmartPermissionWrapper module="Usuarios" action="Editar">
  <Button><Pencil /></Button>
</SmartPermissionWrapper>

// Switch - se muestra si tiene cualquier permiso "Desactivar"  
<SmartPermissionWrapper module="Usuarios" action="Desactivar">
  <Switch />
</SmartPermissionWrapper>
```

## Beneficios
- Detección automática de permisos por acción
- Si tiene "Usuarios.Editar" verá botones de editar en toda la app
- No necesita especificar cada módulo-permiso individual