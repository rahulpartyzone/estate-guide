import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type AdminUser = {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  userRoles?: Array<{ role: { id: string; name: string } }>;
};

type RoleConfig = {
  id: string;
  name: string;
  description?: string | null;
  rolePermissions?: Array<{ permission: { key: string } }>;
  menuAccess?: Array<{ canView: boolean; menuItem: { key: string; label: string; path: string } }>;
};

type PermissionItem = { id: string; key: string };
type MenuItem = { id: string; key: string; label: string; path: string };

const AdminUsersAccess = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [selectedMenuKeys, setSelectedMenuKeys] = useState<string[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleName, setInviteRoleName] = useState("");
  const [lastInviteToken, setLastInviteToken] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [lastEmailSent, setLastEmailSent] = useState<boolean | null>(null);
  const [lastEmailError, setLastEmailError] = useState("");

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || null,
    [roles, selectedRoleId],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, permissionsData, menuData] = await Promise.all([
        api.listAdminUsers(),
        api.listRbacRoles(),
        api.listRbacPermissions(),
        api.listRbacMenuItems(),
      ]);

      setUsers(usersData || []);
      setRoles(rolesData || []);
      setPermissions(permissionsData || []);
      setMenuItems(menuData || []);

      const firstRole = (rolesData || [])[0];
      if (firstRole) {
        setSelectedRoleId((current) => current || firstRole.id);
        setInviteRoleName((current) => current || firstRole.name);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load users and access config",
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

    setSelectedPermissionKeys(
      (selectedRole.rolePermissions || []).map((entry) => entry.permission.key),
    );
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

  const createInvite = async () => {
    if (!inviteEmail.trim() || !inviteRoleName.trim()) {
      toast({
        title: "Missing details",
        description: "Email and role are required.",
        variant: "destructive",
      });
      return;
    }

    setCreatingInvite(true);
    try {
      const result = await api.createUserInvite({ email: inviteEmail.trim(), roleName: inviteRoleName });
      setLastInviteToken(result?.token || "");
      const inviteUrl = result?.inviteUrl || "";
      setLastInviteUrl(inviteUrl);
      setLastEmailSent(Boolean(result?.emailSent));
      setLastEmailError(result?.emailError || "");
      setInviteEmail("");
      toast({
        title: "Invite created",
        description: result?.emailSent ? "Invite email sent to user." : "Invite created. Share link/token manually.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to create invite",
        description: error?.message || "Please retry",
        variant: "destructive",
      });
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyInviteLink = async () => {
    if (!lastInviteUrl) return;
    try {
      await navigator.clipboard.writeText(lastInviteUrl);
      toast({ title: "Copied", description: "Invite link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading users and access configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="invite-email">User Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="new.user@example.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRoleName} onValueChange={setInviteRoleName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={createInvite} disabled={creatingInvite}>
              {creatingInvite ? "Creating..." : "Create Invite"}
            </Button>
            <Button type="button" variant="outline" onClick={copyInviteLink} disabled={!lastInviteUrl}>
              Copy Invite Link
            </Button>
            {lastInviteToken ? (
              <Badge variant="secondary" className="break-all max-w-full">Token: {lastInviteToken}</Badge>
            ) : null}
            {lastInviteUrl ? (
              <Badge variant="outline" className="break-all max-w-full">Link: {lastInviteUrl}</Badge>
            ) : null}
            {lastEmailSent !== null ? (
              <Badge variant={lastEmailSent ? "secondary" : "destructive"} className="max-w-full break-all">
                {lastEmailSent ? "Invite email sent" : `Email not sent${lastEmailError ? `: ${lastEmailError}` : ""}`}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Roles: {(user.userRoles || []).map((entry) => entry.role.name).join(", ") || user.role}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.isActive ? "Active" : "Disabled"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Configuration</CardTitle>
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
            {selectedRole?.description ? (
              <p className="text-xs text-muted-foreground">{selectedRole.description}</p>
            ) : null}
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
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => togglePermission(permission.key, value === true)}
                      />
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
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleMenu(menuItem.key, value === true)}
                      />
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
    </div>
  );
};

export default AdminUsersAccess;
