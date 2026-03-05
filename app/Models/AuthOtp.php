<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthOtp extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'challenge_id',
        'purpose',
        'channel',
        'code_hash',
        'attempts',
        'max_attempts',
        'sent_at',
        'expires_at',
        'consumed_at',
        'invalidated_at',
        'last_attempt_at',
        'meta',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'expires_at' => 'datetime',
        'consumed_at' => 'datetime',
        'invalidated_at' => 'datetime',
        'last_attempt_at' => 'datetime',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
