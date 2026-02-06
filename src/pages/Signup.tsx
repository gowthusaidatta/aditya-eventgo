import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCognitoAuth } from "@/contexts/CognitoAuthContext";
import eventgoLogo from "@/assets/eventgo-logo.png";

export default function Signup() {
  const { signup } = useCognitoAuth();

  return (
    <div className="flex min-h-screen items-center justify-center hero-section p-4 py-8">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  Create your account on the secure EventGo sign-up page.
                </p>
                <Button type="button" className="w-full" onClick={signup}>
                  Continue to Sign Up
                </Button>
              </div>
            </CardContent>
                      <FormItem>
                        <FormLabel className="text-white/80">College/University Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter college name" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="collegeRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Your Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-white/20 bg-white/10 text-white">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="host">Host (Event Organizer)</SelectItem>
                            <SelectItem value="principal">Principal</SelectItem>
                            <SelectItem value="dean">Dean</SelectItem>
                            <SelectItem value="staff_coordinator">Staff Coordinator</SelectItem>
                            <SelectItem value="student_coordinator">Student Coordinator</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm your password" className="border-white/20 bg-white/10 text-white placeholder:text-white/40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-white/60">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
          <Link to="/" className="text-sm text-white/40 hover:text-white/60">
            ← Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
