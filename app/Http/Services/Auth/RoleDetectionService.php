<?php

namespace App\Http\Services\Auth;

class RoleDetectionService
{
    public function isAllowListedEmail(string $email): bool
    {
        $normalizedEmail = strtolower(trim($email));
        $allowListedEmails = $this->allowlistedEmails();

        return in_array($normalizedEmail, $allowListedEmails, true);
    }

    public function detectUserRole(string $email): ?string
    {
        $normalizedEmail = strtolower(trim($email));
        $adminEmails = $this->adminEmails();
        if (in_array($normalizedEmail, $adminEmails, true)) {
            return 'admin';
        }

        $teacherEmails = $this->teacherEmails();
        if (in_array($normalizedEmail, $teacherEmails, true)) {
            return 'teacher';
        }

        if (!$this->isAllowListedEmail($normalizedEmail) && !str_ends_with($normalizedEmail, '@aust.edu')) {
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

    private function adminEmails(): array
    {
        return $this->mergeConfiguredAndRuntimeEmails(
            config('auth_roles.admin_emails', []),
            (string) env('ADMIN_EMAILS', '')
        );
    }

    private function teacherEmails(): array
    {
        return $this->mergeConfiguredAndRuntimeEmails(
            config('auth_roles.teacher_emails', []),
            (string) env('TEACHER_EMAILS', '')
        );
    }

    private function allowlistedEmails(): array
    {
        return array_values(array_unique(array_merge(
            $this->adminEmails(),
            $this->teacherEmails(),
            $this->normalizeEmails((array) config('auth_roles.allowlisted_emails', []))
        )));
    }

    private function mergeConfiguredAndRuntimeEmails(array $configured, string $runtime): array
    {
        return array_values(array_unique(array_merge(
            $this->normalizeEmails($configured),
            $this->parseRoleEmails($runtime)
        )));
    }

    private function normalizeEmails(array $emails): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn (mixed $email): string => strtolower(trim((string) $email, " \t\n\r\0\x0B\"'")),
            $emails
        ), static fn (string $email): bool => $email !== '')));
    }

    private function parseRoleEmails(string $raw): array
    {
        $parts = preg_split('/[\s,;]+/', $raw) ?: [];

        return $this->normalizeEmails($parts);
    }
}
