<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AdminParkingApplicationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\StudentParkingApplicationController;
use App\Http\Controllers\UsersController;
use Illuminate\Http\Request;

Route::get('/health', fn () => response()->json(['status' => 'API working']));

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/resend-otp', [AuthController::class, 'resendOtp']);
    Route::middleware('web')->group(function () {
        Route::get('/google/redirect', [AuthController::class, 'googleRedirect']);
        Route::get('/google/callback', [AuthController::class, 'googleCallback']);
    });
    Route::middleware('jwt.auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/google/link', [AuthController::class, 'googleLink']);
    });
});

Route::post('/contact', [ContactController::class, 'send']);

Route::middleware('jwt.auth')->group(function () {
    Route::get('/items', [UsersController::class, 'index']);
    Route::get('/items/{id}', [UsersController::class, 'show']);
    Route::post('/items', [UsersController::class, 'store']);
    Route::put('/items/{id}', [UsersController::class, 'update']);
    Route::patch('/items/{id}', [UsersController::class, 'patch']);
    Route::delete('/items/{id}', [UsersController::class, 'destroy']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
});

Route::prefix('admin')->middleware(['jwt.auth', 'role.admin'])->group(function () {
    Route::get('/dashboard', AdminDashboardController::class);
    Route::get('/parking-applications', [AdminParkingApplicationController::class, 'index']);
    Route::get('/parking-applications/{parkingApplication}/documents', [AdminParkingApplicationController::class, 'documents']);
    Route::patch('/parking-applications/{parkingApplication}/status', [AdminParkingApplicationController::class, 'review']);
    Route::get('/documents/{document}/view', [AdminParkingApplicationController::class, 'viewDocument']);
    Route::get('/documents/{document}/download', [AdminParkingApplicationController::class, 'downloadDocument']);
});

Route::prefix('teacher')->middleware(['jwt.auth', 'role.teacher'])->group(function () {
    Route::get('/dashboard', function (Request $request) {
        return response()->json([
            'message' => 'Teacher access granted.',
            'user' => $request->user()?->only(['id', 'name', 'email', 'role']),
        ]);
    });
});

Route::prefix('student')->middleware(['jwt.auth', 'role.student'])->group(function () {
    Route::get('/dashboard', function (Request $request) {
        return response()->json([
            'message' => 'Student access granted.',
            'user' => $request->user()?->only(['id', 'name', 'email', 'role']),
        ]);
    });
    Route::get('/dashboard/summary', [StudentParkingApplicationController::class, 'dashboard']);
    Route::get('/semesters', [StudentParkingApplicationController::class, 'semesters']);
    Route::post('/parking-applications', [StudentParkingApplicationController::class, 'store']);
});
