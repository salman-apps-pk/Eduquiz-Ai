# Security Specification - EduQuiz Ai

## Data Invariants
1. A **User** profile can only be created during signup and if the `uid` matches the authenticated `request.auth.uid`.
2. A **Quiz** can only be created by users with the `teacher` role.
3. An **Attempt** can be created by any authenticated student.
4. **Students** can read any Quiz to attempt it, but cannot delete or modify them.
5. **Teachers** can read all Attempts for analytics.
6. **Students** can only read their own Attempts (privacy).

## The "Dirty Dozen" Payloads

1. **Identity Spoof (User)**: Authenticated as `user_A`, trying to write to `/users/user_B`.
2. **Role Escalation**: Student trying to set their role to `teacher` in their own profile via update.
3. **Ghost Quiz (Teacher)**: Student trying to create a quiz in the `quizzes` collection.
4. **Quiz Hijack**: Teacher `user_A` trying to modify or delete a quiz owned by Teacher `user_B`.
5. **Score Injection**: Student trying to update their own `score` in an `Attempt` document after submission.
6. **Shadow Field**: Adding `isVerified: true` to a User profile.
7. **Identity Theft (Attempt)**: Student `user_A` trying to submit an attempt with `studentId: "user_B"`.
8. **Malicious ID**: Creating a quiz with ID `../../passwords` (ID Poisoning).
9. **Resource Exhaustion**: Sending a 2MB string as quiz title.
10. **Orphaned Attempt**: Creating an attempt for a `quizId` that doesn't exist.
11. **Future Timestamp**: Setting `completedAt` to 10 years in the future.
12. **Public PII Leak**: Unauthenticated user trying to read all email addresses from the `users` collection.

## Test Runner
See `firestore.rules.test.ts` (coming next if I were running local tests, but here I'll focus on rules logic).
