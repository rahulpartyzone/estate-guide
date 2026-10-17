import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const AdminChangePassword = () => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({ title: "Missing fields", description: "Please fill all password fields.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Weak password", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Mismatch", description: "New password and confirm password do not match.", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword, confirmNewPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
    } catch (error: any) {
      toast({ title: "Change failed", description: error?.message || "Please retry.", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="existingPassword">Existing Password</Label>
            <Input
              id="existingPassword"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter existing password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminChangePassword;