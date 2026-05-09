import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    // 1. Gelen veriyi temizleyelim
                    const authData = {
                        email: credentials?.email?.toLocaleLowerCase().trim(),
                        password: credentials?.password
                    };

                    console.log("Backend'e istek atılıyor:", authData.email);

                    // 2. Backend API'ına istek atıyoruz
                    const res = await fetch("http://127.0.0.1:5000/api/auth/login", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(authData),
                    });

                    // Yanıt kodunu kontrol et (401, 500 vb.)
                    if (!res.ok) {
                        const errorData = await res.json();
                        console.error("Backend Hata Mesajı:", errorData.message);
                        return null;
                    }

                    const data = await res.json();

                    // 3. Başarılı giriş kontrolü
                    if (data.token && data.user) {
                        console.log("Giriş Başarılı:", data.user.full_name);
                        return {
                            id: data.user.id.toString(),
                            name: data.user.full_name,
                            email: data.user.email,
                            settings: data.user.settings,
                            accessToken: data.token,
                        };
                    }

                    return null;
                } catch (error) {
                    console.error("NextAuth authorize hatası:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                // Backend'den 'full_name' geliyorsa onu 'name' içine zorla koyuyoruz
                token.name = (user as any).full_name || user.name;
            }
            // Update tetiklendiğinde ismi güncelle
            if (trigger === "update" && session?.name) {
                token.name = session.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                // Session'daki name'in boş kalmamasını sağlıyoruz
                session.user.name = token.name as string;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };