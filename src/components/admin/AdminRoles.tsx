import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type RoleConfig = {
  id: string;
  name: string;
  description?: string | null;
  rolePermissions?: Array<{ permission: { key: string } }>;
  menuAccess?: Array<{ canView: boolean; menuItem: { key: string; label: string; path: string } }>;
};

type PermissionItem = { id: string; key: string };
type MenuItem = { id: string; key: string; label: string; path: string };

const AdminRoles = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);

  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [selectedMenuKeys, setSelectedMenuKeys] = useState<string[]>([]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || null,
    [roles, selectedRoleId],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData, menuData] = await Promise.all([
        api.listRbacRoles(),
        api.listRbacPermissions(),
        api.listRbacMenuItems(),
      ]);

      setRoles(rolesData || []);
      setPermissions(permissionsData || []);
      setMenuItems(menuData || []);

      const firstRole = (rolesData || [])[0];
      if (firstRole) {
        setSelectedRoleId((current) => current || firstRole.id);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load role config",
        description: error?.message || "Please retry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedRole) {
      setSelectedPermissionKeys([]);
      setSelectedMenuKeys([]);
      return;
    }

    setSelectedPermissionKeys((selectedRole.rolePermissions || []).map((entry) => entry.permission.key));
    setSelectedMenuKeys(
      (selectedRole.menuAccess || [])
        .filter((entry) => entry.canView)
        .map((entry) => entry.menuItem.key),
    );
  }, [selectedRole]);

  const togglePermission = (key: string, checked: boolean) => {
    setSelectedPermissionKeys((current) => {
      if (checked) return Array.from(new Set([...current, key]));
      return current.filter((item) => item !== key);
    });
  };

  const toggleMenu = (key: string, checked: boolean) => {
    setSelectedMenuKeys((current) => {
      if (checked) return Array.from(new Set([...current, key]));
      return current.filter((item) => item !== key);
    });
  };

  const savePermissions = async () => {
    if (!selectedRoleId) return;
    setSavingPermissions(true);
    try {
      await api.setRolePermissions(selectedRoleId, selectedPermissionKeys);
      toast({ title: "Permissions updated", description: "Role permissions were saved." });
      await load();
    } catch (error: any) {
      toast({
        title: "Failed to update permissions",
        description: error?.message || "Please retry",
        variant: "destructive",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  const saveMenuAccess = async () => {
    if (!selectedRoleId) return;
    setSavingMenu(true);
    try {
      await api.setRoleMenuAccess(selectedRoleId, selectedMenuKeys);
      toast({ title: "Menu access updated", description: "Role menu visibility was saved." });
      await load();
    } catch (error: any) {
      toast({
        title: "Failed to update menu access",
        description: error?.message || "Please retry",
        variant: "destructive",
      });
    } finally {
      setSavingMenu(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading roles...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles & Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-sm">
          <Label>Role</Label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRole?.description ? <p className="text-xs text-muted-foreground">{selectedRole.description}</p> : null}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Permissions</h3>
              <Button size="sm" onClick={savePermissions} disabled={savingPermissions || !selectedRoleId}>
                {savingPermissions ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
            <div className="border rounded-lg p-3 max-h-80 overflow-auto space-y-2">
              {permissions.map((permission) => {
                const checked = selectedPermissionKeys.includes(permission.key);
                return (
                  <label key={permission.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={(value) => togglePermission(permission.key, value === true)} />
                    <span>{permission.key}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Menu Access</h3>
              <Button size="sm" onClick={saveMenuAccess} disabled={savingMenu || !selectedRoleId}>
                {savingMenu ? "Saving..." : "Save Menu Access"}
              </Button>
            </div>
            <div className="border rounded-lg p-3 max-h-80 overflow-auto space-y-2">
              {menuItems.map((menuItem) => {
                const checked = selectedMenuKeys.includes(menuItem.key);
                return (
                  <label key={menuItem.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleMenu(menuItem.key, value === true)} />
                    <span>{menuItem.label}</span>
                    <span className="text-muted-foreground">({menuItem.path})</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminRoles;
