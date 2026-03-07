<?php

if (!function_exists('parseRoleEmails')) {
    function parseRoleEmails(string $raw): array
    {
        $parts = preg_split('/[\s,;]+/', $raw) ?: [];

        return array_values(array_unique(array_filter(array_map(
            static fn (string $email): string => strtolower(trim($email, " \t\n\r\0\x0B\"'")),
            $parts
        ), static fn (string $email): bool => $email !== '')));
    }
}

$adminEmails = parseRoleEmails((string) env('ADMIN_EMAILS', ''));
$teacherEmails = parseRoleEmails((string) env('TEACHER_EMAILS', ''));

return [
    'admin_emails' => $adminEmails,
    'teacher_emails' => $teacherEmails,
    'allowlisted_emails' => array_values(array_unique(array_merge($adminEmails, $teacherEmails))),
];
