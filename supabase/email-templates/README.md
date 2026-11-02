# AutoAssist Auth Email Configuration

## Confirm signup

Subject:

`Confirm your AutoAssist account`

Template file:

`supabase/email-templates/confirm-signup.html`

Keep `{{ .ConfirmationURL }}` unchanged so Supabase can inject the secure confirmation link.

## Recommended SMTP sender

Use a verified domain or subdomain, for example:

`AutoAssist <no-reply@auth.yourdomain.com>`

Recommended provider: Resend.

Resend SMTP values:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: Resend API key stored only in Supabase Auth SMTP settings

Never put the SMTP password or Resend API key in the Expo app or in `EXPO_PUBLIC_*` variables.

## Supabase Auth redirect configuration

Production/development build redirect allow-list:

`autoassist://**`

Expo Go development redirect allow-list:

`exp://**`

The app generates the signup confirmation redirect with `Linking.createURL("login")`.
