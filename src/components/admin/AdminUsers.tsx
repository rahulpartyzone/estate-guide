import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type AdminUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  receivesLeadAlerts?: boolean;
  userRoles?: Array<{ role: { id: string; name: string } }>;
};

type RoleConfig = { id: string; name: string };

const AdminUsers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [alertSavingId, setAlertSavingId] = useState<string | null>(null);

  const toggleLeadAlerts = async (user: AdminUser, enabled: boolean) => {
    setUsers((rows) => rows.map((u) => (u.id === user.id ? { ...u, receivesLeadAlerts: enabled } : u)));
    setAlertSavingId(user.id);
    try {
      await api.updateAdminUser(user.id, { receivesLeadAlerts: enabled });
      toast({ title: enabled ? `${user.email} will get new-lead emails` : `Lead emails turned off for ${user.email}` });
    } catch (e: any) {
      setUsers((rows) => rows.map((u) => (u.id === user.id ? { ...u, receivesLeadAlerts: !enabled } : u)));
      toast({ title: "Could not update lead alerts", description: e?.message, variant: "destructive" });
    } finally {
      setAlertSavingId(null);
    }
  };
  const [roles, setRoles] = useState<RoleConfig[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleName, setInviteRoleName] = useState("");
  const [lastInviteToken, setLastInviteToken] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [lastEmailSent, setLastEmailSent] = useState<boolean | null>(null);
  const [lastEmailError, setLastEmailError] = useState("");

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editIsActive, setEditIsActive] = useState("true");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        api.listAdminUsers(),
        api.listRbacRoles(),
      ]);

      setUsers(usersData || []);
      setRoles(rolesData || []);

      const firstRole = (rolesData || [])[0];
      if (firstRole) {
        setInviteRoleName((current) => current || firstRole.name);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load users",
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
      setLastInviteUrl(result?.inviteUrl || "");
      setLastEmailSent(Boolean(result?.emailSent));
      setLastEmailError(result?.emailError || "");
      setInviteEmail("");
      toast({
        title: "Invite created",
        description: result?.emailSent ? "Invite email sent to user." : "Invite created. Share link/token manually.",
      });
      await load();
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
      toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
    }
  };

  const startEdit = (user: AdminUser) => {
    const primaryRoleId = user.userRoles?.[0]?.role?.id || roles.find((role) => role.name === user.role)?.id || "";
    setEditingUser(user);
    setEditEmail(user.email || "");
    setEditRoleId(primaryRoleId);
    setEditIsActive(user.isActive ? "true" : "false");
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    if (!editEmail.trim()) {
      toast({ title: "Missing email", description: "Email is required.", variant: "destructive" });
      return;
    }
    if (!editRoleId) {
      toast({ title: "Missing role", description: "Please select a role.", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      await api.updateAdminUser(editingUser.id, {
        email: editEmail.trim(),
        roleId: editRoleId,
        isActive: editIsActive === "true",
      });
      toast({ title: "User updated", description: "User details were saved." });
      setEditingUser(null);
      await load();
    } catch (error: any) {
      toast({
        title: "Failed to update user",
        description: error?.message || "Please retry",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading users...</div>;
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
            {lastInviteToken ? <Badge variant="secondary" className="break-all max-w-full">Token: {lastInviteToken}</Badge> : null}
            {lastInviteUrl ? <Badge variant="outline" className="break-all max-w-full">Link: {lastInviteUrl}</Badge> : null}
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
          <p className="text-sm text-muted-foreground">
            Users with <strong>Lead alerts</strong> on get an email for every new lead: site visits, info requests,
            brochure downloads and preference forms.
          </p>
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
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Switch
                      checked={Boolean(user.receivesLeadAlerts)}
                      disabled={alertSavingId === user.id || !user.isActive}
                      onCheckedChange={(checked) => toggleLeadAlerts(user, checked)}
                      aria-label={`Email new leads to ${user.email}`}
                    />
                    Lead alerts
                  </label>
                  <div className="text-sm text-muted-foreground">{user.isActive ? "Active" : "Disabled"}</div>
                  <Button type="button" variant="outline" size="sm" onClick={() => startEdit(user)}>
                    Edit
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRoleId} onValueChange={setEditRoleId}>
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
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editIsActive} onValueChange={setEditIsActive}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
