<?php

namespace App\Http\Services\Auth;

class RoleDetectionService
{
    public function detectUserRole(string $email): ?string
    {
        $normalizedEmail = strtolower(trim($email));
        $adminEmails = config('auth_roles.admin_emails', []);
        if (in_array($normalizedEmail, $adminEmails, true)) {
            return 'admin';
        }

        $teacherEmails = config('auth_roles.teacher_emails', []);
        if (in_array($normalizedEmail, $teacherEmails, true)) {
            return 'teacher';
        }

        if (!str_ends_with($normalizedEmail, '@aust.edu')) {
            return null;
        }

        $localPart = strstr($normalizedEmail, '@', true);
        if ($localPart === false) {
            return null;
        }

        $segments = array_values(array_filter(
            explode('.', $localPart),
            static fn (string $segment): bool => trim($segment) !== ''
        ));

        return match (count($segments)) {
            2 => 'teacher',
            3 => 'student',
            default => null,
        };
    }
}
