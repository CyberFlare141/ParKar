<?php

namespace Tests\Feature;

use Tests\TestCase;

class WebRootResponseTest extends TestCase
{
    public function test_web_root_returns_successful_response(): void
    {
        $this->get('/')
            ->assertOk();
    }
}
