import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_BASE_URL } from "../../../lib/api";

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
                    const authData = {
                        email: credentials?.email?.toLocaleLowerCase().trim(),
                        password: credentials?.password
                    };

                    console.log("Backend'e istek atılıyor:", authData.email);

                    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(authData),
                    });

                    if (!res.ok) {
                        const errorData = await res.json();
                        console.error("Backend Hata Mesajı:", errorData.message);
                        return null;
                    }

                    const data = await res.json();

                    if (data.token && data.user) {
                        // Backend'den 'full_name' veya 'name' gelme ihtimaline karşı ikisini de kontrol ediyoruz
                        const userName = data.user.full_name || data.user.name || "Kullanıcı";
                        console.log("Giriş Başarılı:", userName);

                        // Burada döndürdüğümüz obje direkt olarak 'jwt' callback'indeki 'user' objesi olur
                        return {
                            id: data.user.id.toString(),
                            name: userName,
                            email: data.user.email,
                            settings: data.user.settings,
                            accessToken: data.token, // Token'ı baştan accessToken olarak mapledik
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
            // Sadece ilk girişte (login) çalışır ve 'user' objesi authorize'dan gelir
            if (user) {
                token.id = user.id;
                token.name = user.name; // Authorize'da name olarak atadığımız için direkt name alıyoruz
                token.accessToken = (user as any).accessToken;
            }

            // Profil sayfasında update() fonksiyonu çağrıldığında tetiklenir
            if (trigger === "update" && session) {
                if (session.name) token.name = session.name;
                if (session.email) token.email = session.email;
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                session.user.name = token.name as string;
                // JWT'deki token'ı güvenli bir şekilde client-side'a (useSession) aktarıyoruz
                (session as any).accessToken = token.accessToken;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };