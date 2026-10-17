import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initialToken = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [token, setToken] = useState(initialToken);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token.trim()) {
      toast({ title: "Token required", description: "Please provide your invite token.", variant: "destructive" });
      return;
    }
    if (password.trim().length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await api.acceptInvite({
        token: token.trim(),
        password,
        name: name.trim() || undefined,
      });
      toast({ title: "Onboarding complete", description: "Your account is ready. Redirecting to admin..." });
      navigate("/admin");
    } catch (error: any) {
      toast({
        title: "Could not accept invite",
        description: error?.message || "Please check token and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Set Up Your Account</CardTitle>
          <p className="text-muted-foreground text-sm">Accept your invite and create your password.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="invite-token">Invite Token</Label>
              <Input
                id="invite-token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste your invite token"
                required
              />
            </div>
            <div>
              <Label htmlFor="full-name">Full Name (optional)</Label>
              <Input
                id="full-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary" disabled={submitting}>
              {submitting ? "Creating account..." : "Complete Onboarding"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
