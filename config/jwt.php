<?php

return [
    'secret' => env('JWT_SECRET', env('APP_KEY')),
    'ttl_minutes' => env('JWT_TTL_MINUTES', 60),
    'issuer' => env('JWT_ISSUER', env('APP_URL', 'parkar-api')),
    'audience' => env('JWT_AUDIENCE', env('APP_URL', 'parkar-client')),
];
