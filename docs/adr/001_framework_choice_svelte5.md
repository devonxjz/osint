# ADR 001: Adopt Svelte 5 for Frontend SaaS Dashboard UI

## Status
**Accepted**

## Context
The project specifications originally described the frontend component architecture in terms of React. However, the client-side workspace in the `fe/` directory has been pre-configured and initialized as a **Svelte 5 + TypeScript + Vite** project. 

Re-initializing the frontend directory in React would:
1. Require the destructive deletion of pre-existing setup configurations.
2. Incur substantial overhead in reinstalling dependencies.
3. Waste system resources and time.

Furthermore, Svelte 5 introduced **Runes** (`$state`, `$derived`, `$effect`, and custom reactive classes), which provides:
*   A powerful, compiler-driven reactive state machine model that perfectly decouples business logic from rendering (enabling the highly optimal **Design C: Reactive Rune State Orchestration**).
*   Zero virtual DOM overhead, leading to superior runtime performance, higher UI thread frame rates (>60fps), and zero CPU stuttering during high-frequency real-time Server-Sent Events (SSE) streaming.
*   Extremely compact, readable component syntax.

## Decision
We will formally adopt **Svelte 5 (with TypeScript and Vite)** as the official frontend framework for the OSINT SaaS Dashboard UI. 

All client-side modules will be built using:
1.  **Svelte 5 Runes** for state management and DOM synchronization.
2.  **TypeScript** for strict interface validation and compile-time correctness.
3.  **Vanilla CSS** powered by a modern HSL Hued palette to meet the high-fidelity SaaS aesthetic constraints.

## Consequences
*   The components defined in Module 7 will be written as `.svelte` files instead of React `.tsx` files.
*   Business logic orchestration will be implemented as custom Svelte 5 class runes (`.svelte.ts`) rather than React context/hooks.
*   Unit tests will be written for Svelte components and Svelte 5 reactive classes.
