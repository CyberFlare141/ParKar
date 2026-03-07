<?php

$adminEmails = array_values(array_filter(array_map(
    static fn (string $email): string => strtolower(trim($email)),
    explode(',', (string) env('ADMIN_EMAILS', ''))
), static fn (string $email): bool => $email !== ''));

$teacherEmails = array_values(array_filter(array_map(
    static fn (string $email): string => strtolower(trim($email)),
    explode(',', (string) env('TEACHER_EMAILS', ''))
), static fn (string $email): bool => $email !== ''));

return [
    'admin_emails' => $adminEmails,
    'teacher_emails' => $teacherEmails,
];
