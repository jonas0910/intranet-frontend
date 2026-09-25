export interface RoleAccess {
  id?: number;
  role_id: number;
  sistema_menu_id: number;
  permisos_adicionales: string[];
  activo: boolean;
  orden: number;
  role?: {
    id: number;
    name: string;
  };
  sistema_menu?: {
    id: number;
    nombre: string;
    sistema: {
      id: number;
      nombre: string;
    };
  };
}

export interface RoleAccessStatistics {
  total_accesos: number;
  accesos_activos: number;
  accesos_por_rol: Array<{
    name: string;
    rol_menus_count: number;
  }>;
  accesos_por_sistema: Array<{
    nombre: string;
    menus_count: number;
  }>;
}
