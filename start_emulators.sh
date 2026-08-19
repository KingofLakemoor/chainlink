#!/bin/bash
firebase emulators:exec "npx vitest run firestore.rules.test.ts" --project chainlink-security-test
