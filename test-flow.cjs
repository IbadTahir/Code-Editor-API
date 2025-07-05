#!/usr/bin/env node

// Verification script to test the complete flow
const axios = require('axios');

async function testCompleteFlow() {
    console.log('🔍 Testing complete authentication and submission flow...\n');
    
    try {
        // Step 1: Login
        console.log('1️⃣ Testing login...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'testuser2@example.com',
            password: 'TestPass123!'
        });
        
        const token = loginResponse.data.accessToken;
        const user = loginResponse.data.user;
        console.log(`✅ Login successful! User: ${user.name} (${user.email})`);
        
        // Step 2: Test evaluators list
        console.log('\n2️⃣ Testing evaluators list...');
        const evaluatorsResponse = await axios.get('http://localhost:8003/api/v1/evaluators/list', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Evaluators list fetched successfully! Found ${evaluatorsResponse.data.total} evaluations`);
        
        // Step 3: Test submission
        console.log('\n3️⃣ Testing evaluation submission...');
        const submissionResponse = await axios.post('http://localhost:8003/api/v1/evaluators/1/submit', {
            submission_content: 'Goroutines are lightweight threads in Go that enable concurrent programming. They are managed by the Go runtime and allow multiple functions to run concurrently without the overhead of traditional OS threads. Channels are used for communication between goroutines, providing a safe way to share data and synchronize operations.'
        }, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ Submission successful!`);
        console.log(`   - Submission ID: ${submissionResponse.data.id}`);
        console.log(`   - Score: ${submissionResponse.data.provisional_grade}%`);
        console.log(`   - Status: ${submissionResponse.data.status}`);
        
        console.log('\n🎉 ALL TESTS PASSED! The authentication and submission flow is working correctly.');
        console.log('\n📝 Next steps:');
        console.log('   1. Open the login helper: file:///d:/web-engineering-main/web-engineering-main/login-helper.html');
        console.log('   2. Log in with: testuser2@example.com / TestPass123!');
        console.log('   3. Go to your main app: http://localhost:5179');
        console.log('   4. Try submitting an evaluation - it should work now!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testCompleteFlow();
