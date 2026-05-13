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
                    const authData = {
                        email: credentials?.email?.toLocaleLowerCase().trim(),
                        password: credentials?.password
                    };

                    console.log("Backend'e istek atılıyor:", authData.email);

                    const res = await fetch("http://127.0.0.1:5000/api/auth/login", {
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
                        const userName = data.user.full_name || data.user.name || "Kullanıcı";
                        console.log("Giriş Başarılı:", userName);

                        return {
                            id: data.user.id.toString(),
                            name: userName,
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
                token.name = user.name;
                token.accessToken = (user as any).accessToken;
            }

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
                (session as any).accessToken = token.accessToken;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };