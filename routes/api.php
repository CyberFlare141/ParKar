<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\StudentParkingApplicationController;
use App\Http\Controllers\UsersController;
use Illuminate\Http\Request;

Route::get('/health', fn () => response()->json(['status' => 'API working']));

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/resend-otp', [AuthController::class, 'resendOtp']);
    Route::middleware('jwt.auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
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
});

Route::prefix('admin')->middleware(['jwt.auth', 'role.admin'])->group(function () {
    Route::get('/dashboard', function (Request $request) {
        return response()->json([
            'message' => 'Admin access granted.',
            'user' => $request->user()?->only(['id', 'name', 'email', 'role']),
        ]);
    });
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
    Route::get('/semesters', [StudentParkingApplicationController::class, 'semesters']);
    Route::post('/parking-applications', [StudentParkingApplicationController::class, 'store']);
});
