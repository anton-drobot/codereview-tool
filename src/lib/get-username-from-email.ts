export function getUsernameFromEmail(email: string): string {
    return email.slice(0, email.indexOf('@'));
}
