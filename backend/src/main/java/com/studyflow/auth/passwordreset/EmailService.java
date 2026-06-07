package com.studyflow.auth.passwordreset;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Service d'envoi d'email.
 * - Si SMTP est configure (MAIL_HOST + MAIL_USERNAME + MAIL_PASSWORD) -> envoi HTML reel.
 * - Sinon -> log dans la console (mode dev), avec le lien clickable.
 */
@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;       // null si pas de SMTP configure

    @Value("${app.mail.from:noreply@studyflow.io}")
    private String fromAddress;

    @Autowired(required = false)
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordResetEmail(String toEmail, String fullName, String resetLink) {
        String subject = "Réinitialisation de votre mot de passe StudyFlow";
        String htmlBody = buildHtmlBody(fullName, resetLink);
        String textBody = buildTextBody(fullName, resetLink);

        if (mailSender == null) {
            log.info("==================== EMAIL (mode dev, pas de SMTP) ====================");
            log.info("To     : {}", toEmail);
            log.info("Subject: {}", subject);
            log.info("Body   :\n{}", textBody);
            log.info("Reset link clickable: {}", resetLink);
            log.info("=======================================================================");
            return;
        }

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, "StudyFlow");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            // Le second argument = HTML version, mais on garde aussi le texte brut pour les clients qui n'affichent pas le HTML
            helper.setText(textBody, htmlBody);
            mailSender.send(mime);
            log.info("Email de reset envoye a {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Echec envoi email a {} : {}", toEmail, e.getMessage());
            log.info("Reset link (fallback console) : {}", resetLink);
        }
    }

    // ---------- Templates ----------

    private String buildHtmlBody(String fullName, String resetLink) {
        String prenom = (fullName == null || fullName.isBlank()) ? "" : fullName;
        return """
            <!DOCTYPE html>
            <html lang="fr">
            <head>
              <meta charset="UTF-8"/>
              <title>Réinitialisation de mot de passe</title>
            </head>
            <body style="margin:0;padding:0;background:#fdf6e3;font-family:Arial,Helvetica,sans-serif;color:#1f232b;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#fdf6e3;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="560" cellspacing="0" cellpadding="0"
                           style="background:#ffffff;border-radius:18px;box-shadow:0 8px 28px rgba(0,0,0,.08);overflow:hidden;">
                      <tr>
                        <td style="background:#1f232b;padding:28px 36px;color:#f5c518;font-size:1.5rem;font-weight:800;">
                          StudyFlow
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:36px;">
                          <h1 style="margin:0 0 14px;font-size:1.4rem;font-weight:800;">Bonjour %s,</h1>
                          <p style="margin:0 0 16px;line-height:1.5;color:#444;">
                            Vous avez demandé la réinitialisation de votre mot de passe StudyFlow.
                            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
                            Ce lien est valable <strong>30 minutes</strong>.
                          </p>
                          <p style="text-align:center;margin:32px 0;">
                            <a href="%s"
                               style="display:inline-block;background:#f5c518;color:#1f232b;text-decoration:none;
                                      padding:14px 28px;border-radius:12px;font-weight:700;font-size:1rem;">
                              Réinitialiser mon mot de passe
                            </a>
                          </p>
                          <p style="margin:0 0 12px;font-size:.88rem;color:#666;">
                            Si le bouton ne marche pas, copiez ce lien dans votre navigateur :
                          </p>
                          <p style="word-break:break-all;background:#f5efdf;border-radius:8px;padding:10px 12px;
                                    font-family:monospace;font-size:.82rem;color:#1f232b;">
                            %s
                          </p>
                          <hr style="margin:32px 0;border:none;border-top:1px solid #eee;"/>
                          <p style="margin:0;font-size:.82rem;color:#888;">
                            Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
                            Votre mot de passe reste inchangé.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f8efdb;padding:18px 36px;text-align:center;font-size:.78rem;color:#888;">
                          © StudyFlow — Plateforme de planification d'étude.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(escape(prenom), resetLink, resetLink);
    }

    private String buildTextBody(String fullName, String resetLink) {
        String prenom = (fullName == null || fullName.isBlank()) ? "" : fullName;
        return """
                Bonjour %s,

                Vous avez demande la reinitialisation de votre mot de passe StudyFlow.
                Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valable 30 minutes) :

                %s

                Si vous n'avez pas demande cette reinitialisation, ignorez simplement cet email.

                — L'equipe StudyFlow
                """.formatted(prenom, resetLink);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
