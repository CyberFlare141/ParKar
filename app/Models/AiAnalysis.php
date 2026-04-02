<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiAnalysis extends Model
{
    use HasFactory;

    protected $table = 'ai_analysis';

    protected $fillable = [
        'application_id',
        'blurry_score',
        'name_match_score',
        'expiry_valid',
        'renewal_recommendation',
        'risk_score',
        'raw_response',
    ];

    protected $casts = [
        'raw_response' => 'array',
        'expiry_valid' => 'boolean',
        'renewal_recommendation' => 'boolean',
        'blurry_score' => 'float',
        'name_match_score' => 'float',
        'risk_score' => 'float',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(ParkingApplication::class, 'application_id');
    }
}
