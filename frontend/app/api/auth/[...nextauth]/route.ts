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
<<<<<<< HEAD
                    // 1. Gelen veriyi temizleyelim
=======
>>>>>>> 4356126d9ffb7a35cb963deaf640c0be088bd90b
                    const authData = {
                        email: credentials?.email?.toLocaleLowerCase().trim(),
                        password: credentials?.password
                    };

                    console.log("Backend'e istek atılıyor:", authData.email);

<<<<<<< HEAD
                    // 2. Backend API'ına istek atıyoruz
=======
>>>>>>> 4356126d9ffb7a35cb963deaf640c0be088bd90b
                    const res = await fetch("http://127.0.0.1:5000/api/auth/login", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(authData),
                    });

<<<<<<< HEAD
                    // Yanıt kodunu kontrol et (401, 500 vb.)
=======
>>>>>>> 4356126d9ffb7a35cb963deaf640c0be088bd90b
                    if (!res.ok) {
                        const errorData = await res.json();
                        console.error("Backend Hata Mesajı:", errorData.message);
                        return null;
                    }

                    const data = await res.json();

<<<<<<< HEAD
                    // 3. Başarılı giriş kontrolü
                    if (data.token && data.user) {
                        console.log("Giriş Başarılı:", data.user.full_name);
                        return {
                            id: data.user.id.toString(),
                            name: data.user.full_name,
                            email: data.user.email,
                            settings: data.user.settings,
                            accessToken: data.token,
=======
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
>>>>>>> 4356126d9ffb7a35cb963deaf640c0be088bd90b
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 4356126d9ffb7a35cb963deaf640c0be088bd90b
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };