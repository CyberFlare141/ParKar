<?php

namespace App\Exceptions;

use RuntimeException;

class GoogleAuthException extends RuntimeException
{
    public function __construct(
        string $message,
        private readonly int $status = 422
    ) {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }

    public static function disabledAccount(): self
    {
        return new self('Your account is deactivated.', 403);
    }

    public static function googleAccountLinkedElsewhere(): self
    {
        return new self('Google account already linked to another user.', 409);
    }

    public static function mismatchedEmail(): self
    {
        return new self('Google account email must match your signed-in account.', 409);
    }

    public static function missingEmail(): self
    {
        return new self('Google account did not return a usable email address.', 422);
    }
}
