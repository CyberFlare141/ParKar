<?php

/*
|--------------------------------------------------------------------------
| ADD this block to your existing config/services.php
|--------------------------------------------------------------------------
|
| In your .env file add:
|
|   AI_SERVICE_URL=http://localhost:5001
|   AI_SERVICE_TIMEOUT=30
|
*/

return [

    // ... your existing services (mailgun, postmark, ses, etc.) ...

    /*
    |------------------------------------------------------------------
    | ParKar AI Document Verification Microservice
    |------------------------------------------------------------------
    */
    'ai_document' => [
        'url'     => env('AI_SERVICE_URL', 'http://localhost:5001'),
        'timeout' => (int) env('AI_SERVICE_TIMEOUT', 30),
    ],

];
