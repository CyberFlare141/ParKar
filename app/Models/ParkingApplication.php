<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
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
}
