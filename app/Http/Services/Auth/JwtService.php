<?php

namespace App\Http\Services\Auth;

use App\Models\User;
use DateTimeImmutable;
use DateTimeZone;
use Lcobucci\Clock\SystemClock;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Encoding\CannotDecodeContent;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Token\InvalidTokenStructure;
use Lcobucci\JWT\UnencryptedToken;
use Lcobucci\JWT\Validation\Constraint\SignedWith;
use Lcobucci\JWT\Validation\Constraint\ValidAt;
use Lcobucci\JWT\Signer\Key\InMemory;
use RuntimeException;

class JwtService
{
    private readonly Configuration $configuration;

    public function __construct()
    {
        $this->configuration = self::makeConfiguration();
    }

    public static function makeConfiguration(): Configuration
    {
        $secret = (string) config('jwt.secret');
        if (trim($secret) === '') {
            throw new RuntimeException('JWT secret is not configured.');
        }

        return Configuration::forSymmetricSigner(
            new Sha256(),
            InMemory::plainText($secret)
        );
    }

    public function issueToken(User $user): string
    {
        $now = new DateTimeImmutable();
        $ttlMinutes = max((int) config('jwt.ttl_minutes', 60), 1);

        $token = $this->configuration->builder()
            ->issuedBy((string) config('jwt.issuer'))
            ->permittedFor((string) config('jwt.audience'))
            ->issuedAt($now)
            ->canOnlyBeUsedAfter($now)
            ->expiresAt($now->modify("+{$ttlMinutes} minutes"))
            ->withClaim('userId', (int) $user->id)
            ->withClaim('email', (string) $user->email)
            ->withClaim('role', (string) $user->role)
            ->getToken(
                $this->configuration->signer(),
                $this->configuration->signingKey()
            );

        return $token->toString();
    }

    public function parseAndValidate(string $token): ?UnencryptedToken
    {
        try {
            $parsed = $this->configuration->parser()->parse($token);
        } catch (CannotDecodeContent|InvalidTokenStructure) {
            return null;
        }

        if (!$parsed instanceof UnencryptedToken) {
            return null;
        }

        $clock = new SystemClock(new DateTimeZone((string) config('app.timezone', 'UTC')));
        $constraints = [
            new SignedWith($this->configuration->signer(), $this->configuration->verificationKey()),
            new ValidAt($clock),
        ];

        if (!$this->configuration->validator()->validate($parsed, ...$constraints)) {
            return null;
        }

        return $parsed;
    }
}
