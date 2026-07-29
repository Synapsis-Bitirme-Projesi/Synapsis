const cron = require('node-cron');
const pool = require('../config/db'); // Kendi DB bağlantı dosyanın yolu
const nodemailer = require('nodemailer');

// Mevcut mail altyapın
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    service: process.env.SMTP_SERVICE,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});

// Her saat başı çalışacak Cron Job (Canlıya alırken '0 * * * *' yapmayı unutma!)
// Şu an test için her dakika ('* * * * *') çalışacak şekilde ayarlı.
const startTaskReminders = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ Hatırlatıcı kontrolü çalışıyor...');

        try {
            // DİKKAT: İsim çekme kısmı (u.username) tamamen kaldırıldı. Sadece id, title, due_date ve email çekiliyor.
            const query = `
    SELECT t.id, t.title, t.due_date, u.email 
    FROM tasks t
    JOIN users u ON t.user_id = u.id
    WHERE t.status != 'completed' 
    AND t.reminder_sent = false
`;

            const result = await pool.query(query);
            const tasks = result.rows;

            if (tasks.length === 0) {
                console.log('Şu an için yaklaşan yeni görev bulunamadı.');
                return;
            }

            for (const task of tasks) {
                // Veritabanından isim gelmediği için her zaman 'Kullanıcı' yazacak.
                const displayName = 'Kullanıcı';

                // Mail İçeriği
                const mailOptions = {
                    from: `"Synapsis Asistanı" <${process.env.EMAIL_FROM}>`,
                    to: task.email,
                    subject: `Yaklaşan Görev Hatırlatması: ${task.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <h2 style="color: #2563eb;">Merhaba ${displayName},</h2>
                            <p style="color: #334155; font-size: 16px;">
                                <strong>"${task.title}"</strong> adlı görevinin teslim tarihine 24 saatten az bir süre kaldı!
                            </p>
                            <p style="color: #334155; font-size: 16px;">
                                Görevlerini zamanında bitirmek ve planlamanı yönetmek için hemen platforma giriş yapabilirsin.
                            </p>
                            <br>
                            <p style="color: #64748b; font-size: 14px;">
                                Başarılar,<br>
                                <strong>Synapsis Ekibi</strong>
                            </p>
                        </div>
                    `
                };

                // Maili Gönder
                await transporter.sendMail(mailOptions);
                console.log(`✅ Mail başarıyla gönderildi: ${task.email} - Görev: ${task.title}`);

                // Gönderildi olarak işaretle ki bir sonraki döngüde tekrar mail atmasın
                await pool.query('UPDATE tasks SET reminder_sent = true WHERE id = $1', [task.id]);
            }

        } catch (error) {
            console.error('❌ Hatırlatıcı cron job hatası:', error);
        }
    });
};

module.exports = { startTaskReminders };