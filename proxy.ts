import { withAuth } from "next-auth/middleware";

// Mengekspor fungsi middleware secara eksplisit
export default withAuth({
  pages: {
    signIn: "/login", // Arahkan ke halaman login kita jika belum masuk
  },
});

export const config = { 
  matcher: [
    "/", 
    "/api/tasks/:path*"
  ] 
};