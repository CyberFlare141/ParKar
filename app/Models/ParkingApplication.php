<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Model;

class ParkingApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'semester_id',
        'vehicle_id',
        'status',
        'priority_score',
        'ai_flag',
        'admin_comment',
        'reviewed_by',
        'reviewed_at',
        'register_as',
        'applicant_name',
        'applicant_university_id',
        'applicant_email',
        'applicant_phone',
        'notes',
        'nda_signed',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(
            Document::class,
            'application_documents',
            'application_id',
            'document_id'
        )->withPivot('created_at');
    }

    public function parkingTicket(): HasOne
    {
        return $this->hasOne(ParkingTicket::class, 'application_id');
    }

    public function aiAnalysis(): HasOne
    {
        return $this->hasOne(AiAnalysis::class, 'application_id');
    }
}
