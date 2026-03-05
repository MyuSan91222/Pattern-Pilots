# Software Engineering — Ian Sommerville (10th Edition)

> **Book:** *Software Engineering* by **Ian Sommerville** — Pearson Education, 10th Edition (2016)
> This is one of the most widely used Software Engineering textbooks globally, adopted in universities and industry worldwide.
> It covers the complete software development lifecycle from requirements to maintenance.

---

## Table of Contents

1. [Requirements Engineering](#1-requirements-engineering)
   - 1.1 [Types of Requirements](#11-types-of-requirements)
   - 1.2 [The Requirements Engineering Process](#12-the-requirements-engineering-process)
   - 1.3 [Elicitation Techniques](#13-elicitation-techniques)
   - 1.4 [Requirements Specification (SRS)](#14-requirements-specification-srs)
   - 1.5 [Requirements Validation](#15-requirements-validation)
   - 1.6 [Requirements Management](#16-requirements-management)
2. [System Modeling](#2-system-modeling)
   - 2.1 [Context Models](#21-context-models)
   - 2.2 [Use Case Diagrams — User to System](#22-use-case-diagrams--user-to-system-interaction)
   - 2.3 [Sequence Diagrams — User to System](#23-sequence-diagrams--user-to-system-interaction)
   - 2.4 [Sequence Diagrams — System to System](#24-sequence-diagrams--system-to-system-interaction)
   - 2.5 [Class Diagrams](#25-class-diagrams)
   - 2.6 [State Machine Diagrams](#26-state-machine-diagrams)
   - 2.7 [Activity Diagrams](#27-activity-diagrams)
   - 2.8 [Component Diagrams — System to System](#28-component-diagrams--system-to-system-interaction)
3. [Architectural Design](#3-architectural-design)
   - 3.1 [Architectural Views](#31-architectural-views)
   - 3.2 [Architectural Patterns](#32-architectural-patterns)
   - 3.3 [Deployment Architecture](#33-deployment-architecture)
   - 3.4 [Quality Attributes and Trade-offs](#34-quality-attributes-and-trade-offs)
4. [Design and Implementation](#4-design-and-implementation)
   - 4.1 [Object-Oriented Design](#41-object-oriented-design)
   - 4.2 [Design Patterns (GoF)](#42-design-patterns-gang-of-four)
   - 4.3 [Component-Based Software Engineering](#43-component-based-software-engineering-cbse)
   - 4.4 [Implementation Issues](#44-implementation-issues)
   - 4.5 [Testing](#45-testing)

---

---

# 1. Requirements Engineering

## Definition

Requirements Engineering (RE) is the process of **establishing the services that a customer requires** from a system and the **constraints under which it operates** and is developed. It is one of the most critical phases — errors introduced here are the most expensive to fix later.

> "The requirements for a system are the descriptions of what the system should do — the services that it provides and the constraints on its operation."
> — *Sommerville, Chapter 4*

---

## 1.1 Types of Requirements

### Functional Requirements

Statements of **services the system should provide** — what the system should do in specific situations, how the system reacts to inputs, and what behavior is expected.

| ID    | Requirement | Description |
|-------|-------------|-------------|
| FR-01 | User Authentication | The system shall allow registered users to log in with email and password |
| FR-02 | Search | The system shall provide a means for users to search all available records |
| FR-03 | Order ID | Every transaction shall be assigned a globally unique identifier |
| FR-04 | Report Generation | The system shall generate monthly attendance reports in PDF and CSV format |
| FR-05 | Notifications | The system shall send email notifications when attendance falls below 75% |

**Characteristics of good functional requirements:**
- **Complete** — All services required by the user are defined
- **Consistent** — No contradictions between requirements
- **Precise** — Unambiguous, only one interpretation possible

---

### Non-Functional Requirements

Constraints on the **services or functions** offered by the system. Often apply to the system as a whole rather than individual features. Failure to meet NFRs can render the entire system unusable.

**Category Tree:**

```
Non-Functional Requirements
├── Product Requirements
│   ├── Usability Requirements
│   │   ├── Understandability
│   │   ├── Learnability
│   │   └── Operability
│   ├── Efficiency Requirements
│   │   ├── Performance Requirements
│   │   │   ├── Response time < 2 seconds
│   │   │   ├── Throughput > 1000 tx/sec
│   │   │   └── Latency < 100ms
│   │   └── Space Requirements
│   │       └── Memory footprint < 512MB
│   ├── Dependability Requirements
│   │   ├── Availability: 99.9% uptime
│   │   ├── Reliability: MTBF > 500 hours
│   │   ├── Safety: No data corruption on failure
│   │   └── Security: AES-256 encryption
│   └── Security Requirements
│       ├── Confidentiality
│       ├── Integrity
│       └── Non-repudiation
│
├── Organisational Requirements
│   ├── Environmental Requirements
│   │   └── Developed using TypeScript/Node.js
│   ├── Operational Requirements
│   │   └── Delivered as Docker containers
│   └── Development Requirements
│       └── Follows ISO 9001 processes
│
└── External Requirements
    ├── Regulatory Requirements
    │   └── GDPR, HIPAA compliance
    ├── Legislative Requirements
    │   └── Data Protection Act
    └── Ethical Requirements
        └── No bias in algorithmic decisions
```

**Non-Functional Requirements Table:**

| ID     | Category     | Requirement | Measure |
|--------|-------------|-------------|---------|
| NFR-01 | Performance | System response time | < 2 seconds for 95% of requests |
| NFR-02 | Availability | System uptime | 99.9% per month |
| NFR-03 | Security | Data encryption | AES-256 for all stored passwords |
| NFR-04 | Scalability | Concurrent users | Support 10,000 simultaneous users |
| NFR-05 | Usability | Learnability | New user productive within 2 hours |
| NFR-06 | Portability | Browser support | Works on Chrome, Firefox, Safari, Edge |
| NFR-07 | Compliance | Data regulation | GDPR compliant for EU users |

---

### Domain Requirements

Requirements derived from the **application domain** of the system, reflecting characteristics and constraints of that domain.

- Medical system must follow clinical terminology standards (HL7 FHIR)
- Banking system must implement double-entry bookkeeping
- Aviation system must follow DO-178C safety standards

---

## 1.2 The Requirements Engineering Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REQUIREMENTS ENGINEERING PROCESS                          │
│                                                                             │
│  ┌───────────┐    ┌─────────────┐    ┌───────────────┐    ┌─────────────┐  │
│  │Feasibility│───▶│ Elicitation │───▶│ Specification │───▶│ Validation  │  │
│  │  Study    │    │ & Analysis  │    │               │    │             │  │
│  └───────────┘    └─────────────┘    └───────────────┘    └─────────────┘  │
│        │                │                    │                    │         │
│        ▼                ▼                    ▼                    ▼         │
│  Feasibility      Requirements         Requirements         Validated      │
│    Report          Models             Document (SRS)       Requirements    │
│                                                                             │
│  ◄─────────────────── Requirements Management (ongoing) ───────────────►  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1: Feasibility Study

Evaluates whether the proposed system is **worth building** before investing in full requirements analysis.

**Questions answered:**
- Does the system contribute to overall organizational objectives?
- Can it be implemented using current technology within budget?
- Can it be integrated with existing systems?

**Output:** Feasibility Report — Go / No-Go decision

---

### Stage 2: Requirements Elicitation and Analysis

Discovering requirements by working with stakeholders.

**Stakeholder types:**
- **End users** — people who directly use the system
- **System owners** — pay for and commission the system
- **System administrators** — configure and maintain the system
- **External stakeholders** — regulators, third-party integrators

---

## 1.3 Elicitation Techniques

### Interviews

| Type | Description | Best For |
|------|-------------|---------|
| **Closed** | Predetermined questions | Confirming understanding |
| **Open** | Exploratory discussion | Discovering new requirements |

**Interview guidelines:**
- Prepare and use a mixture of closed and open-ended questions
- Be open-minded — do not assume you know the answer
- Use a requirements prompt list — generic requirements that apply to most systems
- Arrange to follow up the interview

---

### Scenarios and Use Cases

**Scenario:** A narrative that describes one example of a system interaction.

```
Scenario: Patient booking a hospital appointment

INITIAL ASSUMPTION:
  Patient is registered in the hospital system
  Patient wants to book an appointment with Dr. Smith

NORMAL FLOW:
  1. Patient logs into the patient portal
  2. Patient searches for Dr. Smith by name or specialty
  3. System displays available appointment slots
  4. Patient selects a preferred date and time
  5. System confirms the booking and sends email confirmation
  6. System adds appointment to patient's record

WHAT CAN GO WRONG:
  - No available slots → System offers next available date
  - Patient not registered → System redirects to registration
  - Network failure → System saves draft and notifies patient

SYSTEM STATE ON COMPLETION:
  Appointment record created
  Confirmation email sent
  Doctor's calendar updated
```

---

### Ethnography

**Observational technique** where an analyst embeds themselves in the work environment to understand how people actually work (not just how they say they work).

- Identifies **implicit requirements** not captured in interviews
- Reveals social and organizational factors
- Discovers real workflow vs. documented workflow
- Useful for replacing existing systems

---

### Prototyping

Build a **throwaway or evolutionary prototype** to help stakeholders visualize the system.

```
Identify           Develop          Evaluate          Requirements
Requirements  ───▶ Prototype   ───▶ Prototype    ───▶ Clarified
  Quickly                           with User
```

**Types:**
- **Paper prototype** — sketches and wireframes
- **Clickable prototype** — Figma/Adobe XD mockups
- **Functional prototype** — working code subset

---

## 1.4 Requirements Specification (SRS)

The **Software Requirements Specification** document is the official statement of what is required from system developers.

### IEEE 830 / ISO/IEC 29148 SRS Structure:

```
SOFTWARE REQUIREMENTS SPECIFICATION
════════════════════════════════════
1. Introduction
   1.1 Purpose
   1.2 Document Conventions
   1.3 Intended Audience
   1.4 Project Scope
   1.5 References

2. Overall Description
   2.1 Product Perspective
   2.2 Product Functions (summary)
   2.3 User Classes and Characteristics
   2.4 Operating Environment
   2.5 Design and Implementation Constraints
   2.6 Assumptions and Dependencies

3. External Interface Requirements
   3.1 User Interfaces
   3.2 Hardware Interfaces
   3.3 Software Interfaces
   3.4 Communication Interfaces

4. System Features (Functional Requirements)
   4.1 Feature 1: User Authentication
       4.1.1 Description and Priority
       4.1.2 Stimulus/Response Sequences
       4.1.3 Functional Requirements
   4.2 Feature 2: ...

5. Non-Functional Requirements
   5.1 Performance Requirements
   5.2 Safety Requirements
   5.3 Security Requirements
   5.4 Software Quality Attributes
   5.5 Business Rules

6. Other Requirements

Appendix A: Glossary
Appendix B: Analysis Models
Appendix C: Issues List
```

---

## 1.5 Requirements Validation

Checking that requirements actually define the system the customer wants.

**Validation Checks:**

| Check | Question | Example Problem |
|-------|----------|-----------------|
| **Validity** | Do requirements reflect real user needs? | Requirement based on misunderstanding |
| **Consistency** | No conflicting requirements? | FR-01 says blue, FR-07 says red |
| **Completeness** | All requirements included? | Missing error handling for login failure |
| **Realism** | Implementable within budget/time? | "Real-time" with 10ms latency on cheap hardware |
| **Verifiability** | Can the requirement be tested? | "System shall be fast" — not verifiable |

**Validation Techniques:**

| Technique | Description |
|-----------|-------------|
| **Requirements Reviews** | Systematic manual analysis by stakeholders and engineers |
| **Prototyping** | Build executable model, demonstrate to customers |
| **Test-case Generation** | Try to write tests — if you can't, requirement is bad |
| **Automated Consistency Analysis** | Tools check formal specifications |

---

## 1.6 Requirements Management

Managing **evolving requirements** throughout the software development lifecycle.

**Why requirements change:**
- Business environment changes
- Customer understanding deepens after seeing a prototype
- Different stakeholders have conflicting priorities
- Technical constraints discovered during implementation

**Change Management Process:**

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌────────────────┐
│   Change    │───▶│ Impact Analysis │───▶│    Change    │───▶│    Change      │
│   Request   │    │                 │    │   Decision   │    │ Implementation │
│  Submitted  │    │ Cost? Risk?     │    │ Accept/Reject│    │ + Traceability │
│             │    │ Dependencies?   │    │ /Defer       │    │   Update       │
└─────────────┘    └─────────────────┘    └──────────────┘    └────────────────┘
```

**Requirements Traceability Matrix (RTM):**

| Req ID | Requirement | Use Case | Design Component | Test Case | Status |
|--------|-------------|----------|-----------------|-----------|--------|
| FR-01 | User Login | UC-01 | AuthService | TC-001 | Implemented |
| FR-02 | Search | UC-03 | SearchController | TC-012 | In Progress |
| FR-05 | Notifications | UC-07 | NotificationService | TC-031 | Not Started |

---

---

# 2. System Modeling

## Definition

System modeling is the process of developing **abstract models** of a system, with each model presenting a different view or perspective. Models are used to:
- Aid the analyst in **understanding** system functionality
- Communicate with **customers** without technical jargon
- Help **designers** understand the system to be built
- Document the system for **maintenance** engineers

> "Models help us understand what a system should do and how its components interact."
> — *Sommerville, Chapter 5*

---

## Model Perspectives

| Perspective | Question Answered | UML Diagrams |
|-------------|------------------|--------------|
| **External** | What is the system context? | Context diagram, Deployment diagram |
| **Interaction** | How does the system interact? | Use Case, Sequence, Communication |
| **Structural** | How is the system organized? | Class, Component, Package |
| **Behavioral** | How does the system behave dynamically? | State, Activity |

---

## 2.1 Context Models

**System context** defines what is **outside** the system boundary and what interacts with it.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        ATTENDANCE SYSTEM CONTEXT                         ║
║                                                                          ║
║   ┌──────────┐       ┌─────────────────────────┐       ┌─────────────┐  ║
║   │ Student  │──────▶│                         │──────▶│   Email     │  ║
║   │  Portal  │       │                         │       │   Service   │  ║
║   └──────────┘       │    ATTENDANCE ANALYZER  │       └─────────────┘  ║
║                      │         SYSTEM          │                         ║
║   ┌──────────┐       │                         │──────▶┌─────────────┐  ║
║   │  Admin   │──────▶│                         │       │   Report    │  ║
║   │  Panel   │       │                         │       │  Generator  │  ║
║   └──────────┘       └─────────────────────────┘       └─────────────┘  ║
║                                   │                                      ║
║                                   ▼                                      ║
║                          ┌─────────────────┐                            ║
║                          │    HR / Payroll  │                            ║
║                          │     System      │                            ║
║                          └─────────────────┘                            ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**Context Diagram Elements:**
- **System boundary** — the rectangle surrounding the system
- **External entities** — actors and external systems
- **Data flows** — information exchanged across the boundary
- **Control flows** — triggers and responses

---

## 2.2 Use Case Diagrams — User to System Interaction

Use case diagrams show **what the system does** from the user's perspective. They capture functional requirements as interactions between actors and the system.

### Notation Reference:

```
  ○        — Actor (Person)
  (       ) — Use Case (oval)
  ─────── — Association (actor performs use case)
  ··▶     — <<include>> (always performed)
  ·· ▶    — <<extend>> (optionally performed)
  △        — Generalization (inheritance)
```

---

### Use Case Diagram 1: Attendance Management System (User ↔ System)

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                      ATTENDANCE MANAGEMENT SYSTEM                                 ║
║                                                                                   ║
║    ┌─────────┐                                                  ┌─────────────┐  ║
║    │         │                                                  │             │  ║
║    │ Student │                                                  │    Admin    │  ║
║    │  Actor  │                                                  │    Actor    │  ║
║    │         │                                                  │             │  ║
║    └────┬────┘                                                  └──────┬──────┘  ║
║         │                                                             │          ║
║         │──────────────────┐                        ┌────────────────│          ║
║         │                  ▼                        ▼                │          ║
║         │          ╔═══════════════╗      ╔══════════════════╗       │          ║
║         │          ║  Login to     ║      ║  Manage Users    ║       │          ║
║         ├─────────▶║  System       ║      ║  (CRUD)          ║◀──────┤          ║
║         │          ╚═══════════════╝      ╚══════════════════╝       │          ║
║         │                │                        │                  │          ║
║         │                │ <<include>>             │ <<include>>      │          ║
║         │                ▼                        ▼                  │          ║
║         │          ╔═══════════════╗      ╔══════════════════╗       │          ║
║         │          ║  Authenticate ║      ║  Validate Admin  ║       │          ║
║         │          ║  Credentials  ║      ║  Permissions     ║       │          ║
║         │          ╚═══════════════╝      ╚══════════════════╝       │          ║
║         │                                                             │          ║
║         │          ╔═══════════════╗      ╔══════════════════╗       │          ║
║         ├─────────▶║  View         ║      ║  Upload          ║◀──────┤          ║
║         │          ║  Attendance   ║      ║  Attendance      ║       │          ║
║         │          ╚═══════════════╝      ║  Records         ║       │          ║
║         │                │               ╚══════════════════╝       │          ║
║         │                │ <<extend>>              │                  │          ║
║         │                ▼                         │ <<extend>>       │          ║
║         │          ╔═══════════════╗               ▼                  │          ║
║         │          ║  Filter by    ║      ╔══════════════════╗       │          ║
║         │          ║  Date Range   ║      ║  Parse CSV/Excel ║       │          ║
║         │          ╚═══════════════╝      ╚══════════════════╝       │          ║
║         │                                                             │          ║
║         │          ╔═══════════════╗      ╔══════════════════╗       │          ║
║         ├─────────▶║  View         ║      ║  Generate        ║◀──────┤          ║
║         │          ║  Dashboard    ║      ║  Reports         ║       │          ║
║         │          ╚═══════════════╝      ╚══════════════════╝       │          ║
║         │                                          │                  │          ║
║         │          ╔═══════════════╗              │ <<extend>>        │          ║
║         ├─────────▶║  Download     ║              ▼                  │          ║
║         │          ║  Report       ║      ╔══════════════════╗       │          ║
║         │          ╚═══════════════╝      ║  Export PDF/CSV  ║       │          ║
║         │                                ╚══════════════════╝       │          ║
║         │          ╔═══════════════╗      ╔══════════════════╗       │          ║
║         └─────────▶║  Update       ║      ║  Configure       ║◀──────┘          ║
║                    ║  Profile      ║      ║  System Settings ║                  ║
║                    ╚═══════════════╝      ╚══════════════════╝                  ║
║                                                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

### Use Case Diagram 2: Hospital Appointment System (Extended Example)

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                        HOSPITAL APPOINTMENT SYSTEM                                ║
║                                                                                   ║
║   ┌─────────┐                                             ┌──────────────────┐   ║
║   │ Patient │                                             │ Medical          │   ║
║   │  ○      │                                             │ Receptionist  ○  │   ║
║   └────┬────┘                                             └────────┬─────────┘   ║
║        │                                                            │             ║
║        │  ╔═══════════════════╗           ╔════════════════════╗   │             ║
║        ├─▶║  Register         ║           ║  Manage           ║◀──┤             ║
║        │  ║  Account          ║           ║  Appointments     ║   │             ║
║        │  ╚═══════════════════╝           ╚════════════════════╝   │             ║
║        │           │                                │              │             ║
║        │           │ <<include>>                    │ <<include>>   │             ║
║        │           ▼                                ▼              │             ║
║        │  ╔═════════════════╗             ╔════════════════════╗   │             ║
║        │  ║  Verify Email   ║             ║  Check Doctor      ║   │             ║
║        │  ╚═════════════════╝             ║  Availability      ║   │             ║
║        │                                 ╚════════════════════╝   │             ║
║        │  ╔═══════════════════╗                                    │             ║
║        ├─▶║  Book             ║◀──────────────────────────────────┤             ║
║        │  ║  Appointment      ║                                    │             ║
║        │  ╚═══════════════════╝                                    │             ║
║        │           │                     ╔════════════════════╗   │             ║
║        │           │ <<extend>>          ║  Send              ║   │             ║
║        │           ▼                     ║  Reminder          ║◀──┤             ║
║        │  ╔═════════════════╗            ╚════════════════════╝   │             ║
║        │  ║  Select         ║                     │               │             ║
║        │  ║  Preferred Time ║                     │ <<include>>   │             ║
║        │  ╚═════════════════╝                     ▼               │             ║
║        │                             ╔════════════════════╗       │             ║
║        │  ╔═══════════════════╗      ║  Email/SMS         ║       │             ║
║        ├─▶║  Cancel           ║      ║  Notification      ║       │             ║
║        │  ║  Appointment      ║      ╚════════════════════╝       │             ║
║        │  ╚═══════════════════╝                                    │             ║
║        │                                                            │             ║
║        │  ╔═══════════════════╗      ╔════════════════════╗       │             ║
║        └─▶║  View Medical     ║      ║  Update Medical    ║◀──────┘             ║
║           ║  History          ║      ║  Records           ║                     ║
║           ╚═══════════════════╝      ╚════════════════════╝                     ║
║                                                                                   ║
║   ┌──────────────┐         Generalization (△)                                    ║
║   │   Doctor  ○  │──────────────────────────▶ (Manage Appointments)              ║
║   └──────────────┘                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 2.3 Sequence Diagrams — User to System Interaction

Sequence diagrams show **time-ordered interactions** between objects or components. They capture the dynamic behavior of a use case.

### Notation Reference:

```
  ┌────┐    — Lifeline box (object/actor)
  │    │    — Lifeline (dashed vertical line)
  ─────▶    — Synchronous message (call, expects return)
  ─────▷    — Asynchronous message (fire and forget)
  ◀─────    — Return message
  ╔════╗    — Activation box (object is active)
  [alt]     — Alternative fragment (if/else)
  [loop]    — Loop fragment
  [opt]     — Optional fragment
  [ref]     — Reference to another diagram
```

---

### Sequence Diagram 1: User Login Flow (User → System)

```
 ┌─────────┐     ┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
 │  User   │     │  Browser /  │     │   Auth           │     │  Database    │
 │  (Actor)│     │  Frontend   │     │   Controller     │     │              │
 └────┬────┘     └──────┬──────┘     └────────┬─────────┘     └──────┬───────┘
      │                 │                      │                      │
      │ Enter email     │                      │                      │
      │ & password      │                      │                      │
      │────────────────▶│                      │                      │
      │                 │                      │                      │
      │                 │ POST /auth/login      │                      │
      │                 │ {email, password}     │                      │
      │                 │─────────────────────▶│                      │
      │                 │                      │                      │
      │                 │                      │ SELECT user          │
      │                 │                      │ WHERE email = ?      │
      │                 │                      │─────────────────────▶│
      │                 │                      │                      │
      │                 │                      │◀─────────────────────│
      │                 │                      │ user record          │
      │                 │                      │                      │
      │                 │                ╔════╗│                      │
      │                 │                ║alt ║│                      │
      │                 │                ╠════╬┤ [user found]         │
      │                 │                ║    ││ bcrypt.compare()     │
      │                 │                ║    ││ password hash        │
      │                 │                ║    ││                      │
      │                 │                ╠════╬┤ [password matches]   │
      │                 │                ║    ││ generate JWT token   │
      │                 │                ║    ││                      │
      │                 │ 200 OK         ║    ││                      │
      │                 │◀─────────────────────│                      │
      │                 │ {token, user}  ║    ││                      │
      │                 │                ╠════╬┤ [user not found OR   │
      │                 │                ║    ││  wrong password]     │
      │                 │ 401 Unauthorized║   ││                      │
      │                 │◀─────────────────────│                      │
      │                 │ {error message}╚════╝│                      │
      │                 │                      │                      │
      │ Show dashboard  │                      │                      │
      │◀────────────────│                      │                      │
      │ OR show error   │                      │                      │
 ┌────┴────┐     ┌──────┴──────┐     ┌────────┴─────────┐     ┌──────┴───────┐
 │  User   │     │  Frontend   │     │   Auth           │     │  Database    │
 └─────────┘     └─────────────┘     └──────────────────┘     └──────────────┘
```

---

### Sequence Diagram 2: Upload Attendance File (User → System → Processing)

```
 ┌─────────┐  ┌──────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────┐
 │  Admin  │  │ Frontend │  │  File Upload  │  │  File Parser  │  │ Database │
 │  User   │  │  (React) │  │  Controller   │  │  Service      │  │ (SQLite) │
 └────┬────┘  └────┬─────┘  └───────┬───────┘  └───────┬───────┘  └────┬─────┘
      │             │                │                   │               │
      │ Select file │                │                   │               │
      │ from disk   │                │                   │               │
      │────────────▶│                │                   │               │
      │             │                │                   │               │
      │             │ POST /upload   │                   │               │
      │             │ multipart/form │                   │               │
      │             │ (CSV/Excel)    │                   │               │
      │             │───────────────▶│                   │               │
      │             │                │                   │               │
      │             │         ╔══════╧═══════╗           │               │
      │             │         ║ Validate     ║           │               │
      │             │         ║ file type    ║           │               │
      │             │         ║ & size       ║           │               │
      │             │         ╚══════╤═══════╝           │               │
      │             │                │                   │               │
      │             │                │ parse(fileBuffer) │               │
      │             │                │──────────────────▶│               │
      │             │                │                   │               │
      │             │                │             ╔═════╧══════╗        │
      │             │                │             ║ Read rows  ║        │
      │             │                │             ║ Validate   ║        │
      │             │                │             ║ columns    ║        │
      │             │                │             ║ Transform  ║        │
      │             │                │             ║ data types ║        │
      │             │                │             ╚═════╤══════╝        │
      │             │                │                   │               │
      │             │                │◀──────────────────│               │
      │             │                │ parsedRecords[]   │               │
      │             │                │                   │               │
      │             │                │ INSERT INTO       │               │
      │             │                │ attendance        │               │
      │             │                │ VALUES(batch)     │               │
      │             │                │───────────────────────────────────▶│
      │             │                │                   │               │
      │             │                │◀──────────────────────────────────│
      │             │                │ {inserted: 245,   │               │
      │             │                │  skipped: 3}      │               │
      │             │                │                   │               │
      │             │ 200 OK         │                   │               │
      │             │ {success, stats}│                  │               │
      │             │◀───────────────│                   │               │
      │             │                │                   │               │
      │ Show success│                │                   │               │
      │ notification│                │                   │               │
      │◀────────────│                │                   │               │
 ┌────┴────┐  ┌────┴─────┐  ┌───────┴───────┐  ┌───────┴───────┐  ┌────┴─────┐
 │  Admin  │  │ Frontend │  │  File Upload  │  │  File Parser  │  │ Database │
 └─────────┘  └──────────┘  └───────────────┘  └───────────────┘  └──────────┘
```

---

### Sequence Diagram 3: User Requests Report Generation (User → System)

```
 ┌─────────┐  ┌──────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────┐
 │  User   │  │ Frontend │  │  Report       │  │  Analytics    │  │ Database │
 │         │  │  (React) │  │  Controller   │  │  Engine       │  │          │
 └────┬────┘  └────┬─────┘  └───────┬───────┘  └───────┬───────┘  └────┬─────┘
      │             │                │                   │               │
      │ Set filters │                │                   │               │
      │ (date, dept)│                │                   │               │
      │────────────▶│                │                   │               │
      │             │                │                   │               │
      │             │ GET /reports   │                   │               │
      │             │ ?from=&to=     │                   │               │
      │             │ &dept=&format= │                   │               │
      │             │───────────────▶│                   │               │
      │             │                │                   │               │
      │             │                │ computeStats()    │               │
      │             │                │──────────────────▶│               │
      │             │                │                   │               │
      │             │                │                   │ SELECT ...    │
      │             │                │                   │ FROM          │
      │             │                │                   │ attendance    │
      │             │                │                   │ WHERE date    │
      │             │                │                   │ BETWEEN ...   │
      │             │                │                   │──────────────▶│
      │             │                │                   │               │
      │             │                │                   │◀──────────────│
      │             │                │                   │ raw records   │
      │             │                │                   │               │
      │             │                │             ╔═════╧══════╗        │
      │             │                │             ║ Calculate  ║        │
      │             │                │             ║ averages   ║        │
      │             │                │             ║ trends     ║        │
      │             │                │             ║ scores     ║        │
      │             │                │             ╚═════╤══════╝        │
      │             │                │                   │               │
      │             │                │◀──────────────────│               │
      │             │                │ {stats, trends}   │               │
      │             │                │                   │               │
      │             │ 200 OK         │                   │               │
      │             │ {report data}  │                   │               │
      │             │◀───────────────│                   │               │
      │             │                │                   │               │
      │ Render chart│                │                   │               │
      │ & table     │                │                   │               │
      │◀────────────│                │                   │               │
      │             │                │                   │               │
      │ Click Export│                │                   │               │
      │────────────▶│                │                   │               │
      │             │                │                   │               │
      │             │ GET /reports   │                   │               │
      │             │ /export?format │                   │               │
      │             │ =pdf           │                   │               │
      │             │───────────────▶│                   │               │
      │             │                │                   │               │
      │             │ 200 file.pdf   │                   │               │
      │             │◀───────────────│                   │               │
      │             │                │                   │               │
      │ File download               │                   │               │
      │ starts      │                │                   │               │
      │◀────────────│                │                   │               │
 ┌────┴────┐  ┌────┴─────┐  ┌───────┴───────┐  ┌───────┴───────┐  ┌────┴─────┐
 │  User   │  │ Frontend │  │  Report       │  │  Analytics    │  │ Database │
 └─────────┘  └──────────┘  └───────────────┘  └───────────────┘  └──────────┘
```

---

## 2.4 Sequence Diagrams — System to System Interaction

These diagrams show how **two or more separate systems** communicate with each other — typically via APIs, message queues, or shared databases.

---

### Sequence Diagram 4: Attendance System ↔ HR Payroll System (System-to-System)

```
 ┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐  ┌──────────────┐
 │  Attendance      │  │  API Gateway  │  │  HR Payroll      │  │  Payroll     │
 │  System          │  │  (REST)       │  │  System          │  │  Database    │
 └────────┬─────────┘  └───────┬───────┘  └────────┬─────────┘  └──────┬───────┘
          │                    │                    │                    │
          │ [Monthly Schedule] │                    │                    │
          │                    │                    │                    │
          │ POST /api/v1/      │                    │                    │
          │ attendance/export  │                    │                    │
          │ Authorization:     │                    │                    │
          │ Bearer {API_KEY}   │                    │                    │
          │───────────────────▶│                    │                    │
          │                    │                    │                    │
          │                    │ Validate API Key   │                    │
          │                    │ Check Rate Limits  │                    │
          │                    │                    │                    │
          │                    │ POST /internal/    │                    │
          │                    │ attendance         │                    │
          │                    │ {employeeId,       │                    │
          │                    │  month, days[]}    │                    │
          │                    │───────────────────▶│                    │
          │                    │                    │                    │
          │                    │                    │ Validate employee  │
          │                    │                    │ IDs exist          │
          │                    │                    │───────────────────▶│
          │                    │                    │                    │
          │                    │                    │◀───────────────────│
          │                    │                    │ employee records   │
          │                    │                    │                    │
          │                    │                    │ UPDATE salary      │
          │                    │                    │ WHERE deduction    │
          │                    │                    │ = absent_days      │
          │                    │                    │───────────────────▶│
          │                    │                    │                    │
          │                    │                    │◀───────────────────│
          │                    │                    │ {updated: 150}     │
          │                    │                    │                    │
          │                    │◀───────────────────│                    │
          │                    │ 200 OK             │                    │
          │                    │ {processed: 150,   │                    │
          │                    │  errors: []}       │                    │
          │                    │                    │                    │
          │◀───────────────────│                    │                    │
          │ {status: "success",│                    │                    │
          │  jobId: "abc-123"} │                    │                    │
          │                    │                    │                    │
 ┌────────┴─────────┐  ┌───────┴───────┐  ┌────────┴─────────┐  ┌──────┴───────┐
 │  Attendance      │  │  API Gateway  │  │  HR Payroll      │  │  Payroll     │
 │  System          │  │               │  │  System          │  │  Database    │
 └──────────────────┘  └───────────────┘  └──────────────────┘  └──────────────┘
```

---

### Sequence Diagram 5: Notification Service Integration (System-to-System via Message Queue)

```
 ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
 │  Attendance    │  │   Message    │  │  Notification    │  │  Email / SMS │
 │  System        │  │   Queue      │  │  Service         │  │  Provider    │
 │                │  │  (RabbitMQ)  │  │                  │  │  (SendGrid)  │
 └───────┬────────┘  └──────┬───────┘  └────────┬─────────┘  └──────┬───────┘
         │                  │                    │                    │
         │ [Trigger: student│                    │                    │
         │  attendance < 75%│                    │                    │
         │                  │                    │                    │
         │ Publish event    │                    │                    │
         │ EXCHANGE: alerts │                    │                    │
         │ ROUTING_KEY:     │                    │                    │
         │ attendance.low   │                    │                    │
         │ {                │                    │                    │
         │   studentId: 123 │                    │                    │
         │   percentage: 72 │                    │                    │
         │   threshold: 75  │                    │                    │
         │ }                │                    │                    │
         │─────────────────▶│                    │                    │
         │                  │                    │                    │
         │ ACK              │                    │                    │
         │◀─────────────────│                    │                    │
         │                  │                    │                    │
         │                  │ [Async delivery]   │                    │
         │                  │ QUEUE: notifications│                   │
         │                  │ CONSUMER: notif-svc │                   │
         │                  │────────────────────▶│                   │
         │                  │                    │                    │
         │                  │                    │ GET student details│
         │                  │                    │──────────────────▶ │
         │                  │                    │ (internal API call)│
         │                  │                    │                    │
         │                  │                    │ Compose message    │
         │                  │                    │ template           │
         │                  │                    │                    │
         │                  │                    │ POST /mail/send    │
         │                  │                    │ {to, subject, html}│
         │                  │                    │───────────────────▶│
         │                  │                    │                    │
         │                  │                    │◀───────────────────│
         │                  │                    │ {messageId: "xyz"} │
         │                  │                    │                    │
         │                  │                    │ ACK message queue  │
         │                  │◀────────────────────│                   │
         │                  │                    │                    │
 ┌───────┴────────┐  ┌──────┴───────┐  ┌────────┴─────────┐  ┌──────┴───────┐
 │  Attendance    │  │   Message    │  │  Notification    │  │  Email / SMS │
 │  System        │  │   Queue      │  │  Service         │  │  Provider    │
 └────────────────┘  └──────────────┘  └──────────────────┘  └──────────────┘
```

---

### Sequence Diagram 6: OAuth 2.0 Authentication (System-to-System)

```
 ┌──────────┐  ┌────────────────┐  ┌────────────────────┐  ┌────────────────┐
 │   User   │  │  Application   │  │  Auth Server       │  │  Resource      │
 │  (Actor) │  │  (Client)      │  │  (OAuth Provider)  │  │  Server (API)  │
 └────┬─────┘  └───────┬────────┘  └──────────┬─────────┘  └───────┬────────┘
      │                 │                      │                     │
      │ Click           │                      │                     │
      │ "Login with     │                      │                     │
      │  Google"        │                      │                     │
      │────────────────▶│                      │                     │
      │                 │                      │                     │
      │                 │ Redirect to          │                     │
      │                 │ /authorize?          │                     │
      │                 │ client_id=&          │                     │
      │                 │ redirect_uri=&       │                     │
      │                 │ scope=email,profile& │                     │
      │                 │ state=random_string  │                     │
      │                 │─────────────────────▶│                     │
      │                 │                      │                     │
      │ Google Login    │                      │                     │
      │ Page            │                      │                     │
      │◀────────────────────────────────────────                     │
      │                 │                      │                     │
      │ Enter Google    │                      │                     │
      │ credentials     │                      │                     │
      │────────────────────────────────────────▶                     │
      │                 │                      │                     │
      │                 │                      │ Validate credentials│
      │                 │                      │ Generate auth code  │
      │                 │                      │                     │
      │ Redirect back   │                      │                     │
      │ to app with     │                      │                     │
      │ code=AUTH_CODE  │                      │                     │
      │◀────────────────────────────────────────                     │
      │                 │                      │                     │
      │                 │ POST /token          │                     │
      │                 │ {code, client_id,    │                     │
      │                 │  client_secret,      │                     │
      │                 │  redirect_uri}       │                     │
      │                 │─────────────────────▶│                     │
      │                 │                      │                     │
      │                 │◀─────────────────────│                     │
      │                 │ {access_token,       │                     │
      │                 │  refresh_token,      │                     │
      │                 │  expires_in: 3600}   │                     │
      │                 │                      │                     │
      │                 │ GET /api/user/profile│                     │
      │                 │ Authorization:       │                     │
      │                 │ Bearer {access_token}│                     │
      │                 │──────────────────────────────────────────▶│
      │                 │                      │                     │
      │                 │                      │ Validate token      │
      │                 │                      │◀────────────────────│
      │                 │                      │                     │
      │                 │                      │────────────────────▶│
      │                 │                      │ Token valid         │
      │                 │                      │                     │
      │                 │◀──────────────────────────────────────────│
      │                 │ {userId, name,       │                     │
      │                 │  email, picture}     │                     │
      │                 │                      │                     │
      │ Logged in       │                      │                     │
      │ successfully    │                      │                     │
      │◀────────────────│                      │                     │
 ┌────┴─────┐  ┌───────┴────────┐  ┌──────────┴─────────┐  ┌───────┴────────┐
 │   User   │  │  Application   │  │  Auth Server       │  │  Resource      │
 └──────────┘  └────────────────┘  └────────────────────┘  └────────────────┘
```

---

## 2.5 Class Diagrams

Show the **static structure** of the system — classes, their attributes, operations, and relationships.

### Notation Reference:

```
  ┌───────────────┐
  │  ClassName    │  ← Class Name (bold)
  │───────────────│
  │ -privateAttr  │  ← Attributes (- private, + public, # protected)
  │ +publicAttr   │
  │───────────────│
  │ +method()     │  ← Operations/Methods
  │ -helper()     │
  └───────────────┘

  ────────────── Association (uses/knows)
  ──────────◆   Composition (owns, lifecycle)
  ──────────◇   Aggregation (has, no lifecycle)
  ──────────▷   Inheritance (is-a)
  - - - - - ▷   Realization (implements interface)
  - - - - - ▶   Dependency (uses temporarily)
```

---

### Class Diagram: Attendance Management System

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                     ATTENDANCE MANAGEMENT SYSTEM — CLASS DIAGRAM              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

          ┌─────────────────────┐
          │    <<abstract>>     │
          │       User          │
          │─────────────────────│
          │ -id: int            │
          │ -email: string      │
          │ -passwordHash: str  │
          │ -createdAt: Date    │
          │ -isActive: bool     │
          │─────────────────────│
          │ +login(): Token     │
          │ +logout(): void     │
          │ +updateProfile()    │
          │ #hashPassword(): str│
          └──────────┬──────────┘
                     │ <<generalization>>
           ┌─────────┴──────────┐
           │                    │
  ┌────────┴────────┐  ┌────────┴────────┐
  │     Student     │  │      Admin      │
  │─────────────────│  │─────────────────│
  │ -studentId: str │  │ -department: str│
  │ -name: string   │  │ -role: RoleEnum │
  │ -department: str│  │─────────────────│
  │ -year: int      │  │ +manageUsers()  │
  │─────────────────│  │ +viewAllData()  │
  │ +viewAttendance │  │ +exportReport() │
  │  (): Record[]   │  │ +configSystem() │
  │ +downloadReport │  └─────────────────┘
  │  (): File       │
  └────────┬────────┘
           │
           │ 1        *
           └──────────────────┐
                              ▼
                  ┌───────────────────────┐
                  │   AttendanceRecord    │
                  │───────────────────────│
                  │ -id: int              │
                  │ -studentId: int       │◆─────────┐
                  │ -date: Date           │          │
                  │ -status: StatusEnum   │          │
                  │ -courseId: int        │          │
                  │ -markedAt: DateTime   │          │
                  │───────────────────────│          │
                  │ +markPresent(): void  │          │
                  │ +markAbsent(): void   │          │
                  │ +validate(): bool     │          │
                  └───────────┬───────────┘          │
                              │                      │
                 *            │             *         │
                 └────────────┘             │         │
                                           ▼         │
                              ┌─────────────────────┐│
                              │       Course        ││
                              │─────────────────────││
                              │ -id: int            ││
                              │ -name: string       ││
                              │ -code: string       ││
                              │ -credits: int       ││
                              │ -instructorId: int  ││
                              │─────────────────────││
                              │ +getAttendanceRate()││
                              │ +getStudents()      ││
                              └──────────┬──────────┘│
                                         │            │
                              ┌──────────┘            │
                              │                       │
                    ┌─────────▼──────────┐            │
                    │    AttendanceRepo  │◆────────────┘
                    │────────────────────│
                    │ -dbConnection: DB  │
                    │────────────────────│
                    │ +findByStudent()   │
                    │ +findByDate()      │
                    │ +insert()          │
                    │ +batchInsert()     │
                    │ +delete()          │
                    └────────────────────┘
                              │
                              │ uses
                              ▼
                    ┌─────────────────────┐
                    │     Database        │
                    │─────────────────────│
                    │ -connection: SQLite │
                    │─────────────────────│
                    │ +query(): Result[]  │
                    │ +execute(): void    │
                    │ +transaction(): TX  │
                    └─────────────────────┘
```

---

## 2.6 State Machine Diagrams

Show the **dynamic behavior** of a system or object — how it transitions between states in response to events.

### Notation:

```
  ●                    — Initial state (filled circle)
  ◎                    — Final state (circle in circle)
  ┌──────────────┐     — State
  └──────────────┘
  ──event[guard]──▶    — Transition with event and guard condition
  /action              — Action taken during transition
```

---

### State Diagram 1: User Session Lifecycle

```
                        ┌─────────────────────────────────────────────────────┐
                        │              USER SESSION STATE MACHINE              │
                        └─────────────────────────────────────────────────────┘

                                            ●
                                            │
                                            │ System starts
                                            ▼
                              ┌─────────────────────────┐
                              │                         │
                              │       ANONYMOUS         │
                              │   (Not Authenticated)   │
                              │                         │
                              └─────────────┬───────────┘
                                            │
                       submit credentials   │
                      ─────────────────────▶│
                                            ▼
                              ┌─────────────────────────┐
                              │                         │
                              │     AUTHENTICATING      │◀─────────────────┐
                              │   (Validating creds)    │                  │
                              │                         │                  │
                              └─────────────┬───────────┘                  │
                                            │                              │
                        ┌───────────────────┴──────────────────┐           │
                        │                                       │           │
                  [valid creds]                          [invalid creds]   │
                        │                                       │           │
                        ▼                                       ▼           │
          ┌─────────────────────────┐           ┌─────────────────────────┐│
          │                         │           │                         ││
          │     AUTHENTICATED       │           │     AUTH_FAILED         ││
          │   (Active Session)      │           │  (Showing error)        ││
          │                         │           │                         ││
          └─────────────┬───────────┘           └─────────────┬───────────┘│
                        │                                     │             │
                        │ session active                      │ retry       │
          ┌─────────────┤                                     └─────────────┘
          │             │ timeout/logout
          │             │
          │      ┌──────┴──────────────────────────────────┐
          │      │                                         │
          │      │                                    logout clicked
          │      │ timeout                                  │
          │      ▼                                         ▼
          │ ┌─────────────────────┐        ┌─────────────────────────┐
          │ │                     │        │                         │
          │ │  SESSION_EXPIRING   │        │      LOGGING_OUT        │
          │ │  (Warning shown)    │        │  (Cleaning up)          │
          │ │                     │        │                         │
          │ └──────────┬──────────┘        └────────────┬────────────┘
          │            │                                │
          │     ┌──────┴──────────┐                    │
          │     │                 │                    │
          │  refresh           no action               │ cleanup done
          │  token              (30s)                  │
          │     │                 │                    │
          │     ▼                 ▼                    ▼
          │   ┌──────┐     ┌───────────────┐    ┌──────────────────┐
          │   │Active│     │   EXPIRED     │    │    LOGGED_OUT    │
          │   │      │     │ (Force logout)│    │  (Redirected to  │
          │   └──────┘     └──────┬────────┘    │   Login page)    │
          │                       │             └──────────────────┘
          │                       │                      │
          └───────────────────────┴──────────────────────┘
                                  │
                                  ▼
                                  ◎
```

---

### State Diagram 2: Attendance Record Processing

```
                    ●
                    │ File received
                    ▼
      ┌─────────────────────────────┐
      │       FILE_RECEIVED         │
      │   (Validating file type)    │
      └─────────────┬───────────────┘
                    │
         ┌──────────┴──────────────┐
         │                         │
    [valid type]             [invalid type]
         │                         │
         ▼                         ▼
┌────────────────┐       ┌─────────────────┐
│    PARSING     │       │  FILE_REJECTED  │
│ (Reading rows) │       │ (Error shown)   │
└────────┬───────┘       └────────┬────────┘
         │                        │
         │                        │ user tries again
         │                        │─────────────────────────────▶ ●
         │
    ┌────┴──────────────────┐
    │                       │
[parse success]        [parse error]
    │                       │
    ▼                       ▼
┌────────────────┐  ┌────────────────────┐
│  VALIDATING    │  │  PARSE_FAILED      │
│ (Row by row    │  │  (Show row errors) │
│  checking)     │  └────────────────────┘
└────────┬───────┘
         │
    ┌────┴───────────────────────┐
    │                            │
[all valid]             [some rows invalid]
    │                            │
    ▼                            ▼
┌──────────────┐     ┌────────────────────────────┐
│   SAVING     │     │   PARTIAL_VALID            │
│ (Batch       │     │  (Show summary,            │
│  INSERT)     │     │   ask user: skip/abort)    │
└──────┬───────┘     └──────────┬─────────────────┘
       │                        │
       │                 [skip invalid] [abort]
       │                        │         │
       │                        ▼         ▼
       │             ┌──────────────┐   ◎
       │             │   SAVING     │
       │             └──────┬───────┘
       │                    │
       └──────────┬──────────┘
                  │
                  ▼
       ┌────────────────────┐
       │    COMPLETED       │
       │ (Show stats,       │
       │  success message)  │
       └────────────────────┘
                  │
                  ▼
                  ◎
```

---

## 2.7 Activity Diagrams

Show the **flow of activities** in a process — like enhanced flowcharts with parallel flows and decision points.

### Activity Diagram: User Registration Process

```
                              ●
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Show Registration   │
                   │  Form                │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  User Fills Form     │
                   │  (name, email, pass) │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Client-side         │
                   │  Validation          │
                   └──────────┬───────────┘
                              │
                    ┌─────────┴─────────────┐
                    │                       │
               [valid]                 [invalid]
                    │                       │
                    │                       ▼
                    │           ┌───────────────────────┐
                    │           │  Show Inline Errors   │
                    │           └───────────────────────┘
                    │                       │
                    │       ┌───────────────┘
                    │       │
                    ▼       ▼
             ┌──────────────────────────────┐
             │         Submit Form          │
             └──────────────┬───────────────┘
                            │
             ╔══════════════╧══════════════╗
             ║  (Parallel — server-side)   ║
             ╠═════════════════════════════╣
             ║                             ║
     ┌───────╨────────┐       ┌────────────╨────────┐
     │ Check email    │       │ Validate password   │
     │ not taken      │       │ strength            │
     └───────┬────────┘       └────────────┬────────┘
             │                             │
             ╚═════════════════════════════╝
                            │
                 ┌──────────┴──────────────────┐
                 │                             │
         [both pass]                   [one or more fail]
                 │                             │
                 ▼                             ▼
     ┌───────────────────────┐   ┌─────────────────────────┐
     │ Hash password         │   │ Return 400 with          │
     │ (bcrypt, 12 rounds)   │   │ specific error messages  │
     └───────────┬───────────┘   └─────────────────────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │ INSERT user to        │
     │ database              │
     └───────────┬───────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │ Generate welcome      │
     │ email                 │
     └───────────┬───────────┘
                 │
             ╔═══╧════════════════════╗
             ║  (Parallel)            ║
     ┌────────╨──────┐  ┌────────────╨──────┐
     │ Send email    │  │ Generate JWT       │
     │ (async)       │  │ token             │
     └───────────────┘  └────────────┬──────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ Return 201 Created   │
                          │ {token, user}        │
                          └──────────────────────┘
                                     │
                                     ▼
                                     ◎
```

---

## 2.8 Component Diagrams — System to System Interaction

Component diagrams show how **large-scale components** (services, modules, external systems) are connected.

### Component Diagram: Microservices Architecture

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                         PATTERN PILOTS — SYSTEM ARCHITECTURE                   ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║    [Browser / Mobile App]                                                      ║
║           │                                                                    ║
║           │ HTTPS                                                              ║
║           ▼                                                                    ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │                        API GATEWAY                                      │  ║
║  │              (Rate Limiting, Auth, Routing)                             │  ║
║  └────────────────────────────┬────────────────────────────────────────────┘  ║
║                               │                                               ║
║        ┌──────────────────────┼──────────────────────┐                       ║
║        │                      │                      │                       ║
║        ▼                      ▼                      ▼                       ║
║  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐            ║
║  │    AUTH      │    │   ATTENDANCE     │    │    REPORTING     │            ║
║  │   SERVICE    │    │    SERVICE       │    │    SERVICE       │            ║
║  │              │    │                  │    │                  │            ║
║  │ ┌──────────┐ │    │ ┌──────────────┐ │    │ ┌──────────────┐ │            ║
║  │ │ JWT      │ │    │ │ Upload API   │ │    │ │ Analytics    │ │            ║
║  │ │ Manager  │ │    │ │ Parser       │ │    │ │ Engine       │ │            ║
║  │ └──────────┘ │    │ │ Validator    │ │    │ │ PDF/CSV Gen  │ │            ║
║  │ ┌──────────┐ │    │ └──────────────┘ │    │ └──────────────┘ │            ║
║  │ │ Session  │ │    │ ┌──────────────┐ │    └────────┬─────────┘            ║
║  │ │ Manager  │ │    │ │ Batch Insert │ │             │                      ║
║  │ └──────────┘ │    │ └──────────────┘ │             │                      ║
║  └──────┬───────┘    └────────┬─────────┘             │                      ║
║         │                    │                        │                      ║
║         │              ┌─────┘                        │                      ║
║         │              │                              │                      ║
║         ▼              ▼                              ▼                      ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │                      MESSAGE BROKER (RabbitMQ)                       │   ║
║  │  Exchange: events  Queues: notifications, audit-log, analytics       │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║         │                                                                    ║
║         ▼                                                                    ║
║  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐ ║
║  │  NOTIFICATION    │   │   AUDIT LOG      │   │   HR/PAYROLL SYSTEM      │ ║
║  │   SERVICE        │   │   SERVICE        │   │   (External Integration) │ ║
║  │                  │   │                  │   │                          │ ║
║  │  ┌────────────┐  │   │  ┌────────────┐  │   │  ┌────────────────────┐  │ ║
║  │  │ Email      │  │   │  │ Log Writer │  │   │  │ Salary Deduction   │  │ ║
║  │  │ (SendGrid) │  │   │  │ Log Reader │  │   │  │ Calculator         │  │ ║
║  │  │ SMS (Twilio│  │   │  └────────────┘  │   │  └────────────────────┘  │ ║
║  │  └────────────┘  │   └──────────────────┘   └──────────────────────────┘ ║
║  └──────────────────┘                                                        ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │                        DATA LAYER                                    │   ║
║  │                                                                      │   ║
║  │   ┌─────────────────┐    ┌─────────────────┐   ┌─────────────────┐  │   ║
║  │   │  PRIMARY DB     │    │  CACHE LAYER     │   │   FILE STORAGE  │  │   ║
║  │   │  (SQLite/PG)    │    │  (Redis)         │   │   (S3/Local)    │  │   ║
║  │   │                 │    │                  │   │                 │  │   ║
║  │   │ Users           │    │ Sessions         │   │ Uploaded CSV    │  │   ║
║  │   │ Attendance      │    │ Report Cache     │   │ Generated PDFs  │  │   ║
║  │   │ Courses         │    │ Dashboard Data   │   │                 │  │   ║
║  │   └─────────────────┘    └─────────────────┘   └─────────────────┘  │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

---

# 3. Architectural Design

## Definition

Architectural design is the creative process of **identifying the overall structure** of a software system — its principal components (subsystems), their relationships, and how they interact.

> "The architectural design process is concerned with establishing a basic structural framework for a system. It involves identifying the major structural components of a system and the communications between those components."
> — *Sommerville, Chapter 6*

**Why architecture matters:**
- It satisfies the system's **functional requirements**
- It enables **quality attributes** (performance, security, availability)
- It guides **team structure** — each team owns a component
- It enables **incremental delivery** — components can be built independently
- Bad architecture is very **costly to fix** after the fact

---

## 3.1 Architectural Views

The **4+1 Architectural View Model** (Philippe Kruchten, referenced by Sommerville):

| View | Stakeholder | Purpose | Diagrams |
|------|-------------|---------|---------|
| **Logical View** | Designers, End Users | Functional decomposition | Class, State diagrams |
| **Process View** | System Integrators | Runtime processes and concurrency | Activity, Sequence diagrams |
| **Development View** | Programmers | Software structure in development | Package, Component diagrams |
| **Physical View** | System Engineers | Mapping to hardware infrastructure | Deployment diagrams |
| **+1 Scenarios** | All stakeholders | Illustrate the architecture | Use cases |

---

### Deployment Diagram (Physical View): System to Infrastructure

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT DIAGRAM — PRODUCTION ENVIRONMENT                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌─────────────────────────────────────────────────────────────────────┐   ║
║   │                        CLOUD PROVIDER (AWS/Railway)                  │   ║
║   │                                                                      │   ║
║   │   ┌──────────────────┐        ┌──────────────────────────────────┐  │   ║
║   │   │   Load Balancer  │        │           App Server             │  │   ║
║   │   │   (NGINX)        │───────▶│           (Node.js)              │  │   ║
║   │   │                  │        │                                  │  │   ║
║   │   │ Port: 80/443     │        │  ┌────────────────────────────┐  │  │   ║
║   │   │ SSL Termination  │        │  │  Express.js Application    │  │  │   ║
║   │   │                  │        │  │  Port: 3001                │  │  │   ║
║   │   └──────────────────┘        │  │                            │  │  │   ║
║   │                               │  │  Routes: /api/auth         │  │  │   ║
║   │   ┌──────────────────┐        │  │          /api/attendance   │  │  │   ║
║   │   │   CDN / Static   │        │  │          /api/reports      │  │  │   ║
║   │   │   File Server    │        │  └────────────────────────────┘  │  │   ║
║   │   │   (React Build)  │        └──────────────┬───────────────────┘  │   ║
║   │   │                  │                       │                       │   ║
║   │   └──────────────────┘        ┌──────────────┴───────────────────┐  │   ║
║   │                               │         Database Server          │  │   ║
║   │                               │         (SQLite / PostgreSQL)    │  │   ║
║   │                               │                                  │  │   ║
║   │                               │  ┌────────────────────────────┐  │  │   ║
║   │                               │  │  attendance.db             │  │  │   ║
║   │                               │  │  Tables: users,            │  │  │   ║
║   │                               │  │          attendance,       │  │  │   ║
║   │                               │  │          courses           │  │  │   ║
║   │                               │  └────────────────────────────┘  │  │   ║
║   │                               └──────────────────────────────────┘  │   ║
║   └─────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
║   ┌─────────────────────────────────────────────────────────────────────┐   ║
║   │                    CLIENT DEVICES                                    │   ║
║   │   ┌───────────┐      ┌─────────────┐      ┌────────────────────┐   │   ║
║   │   │  Chrome / │      │  Mobile     │      │  API Client        │   │   ║
║   │   │  Firefox  │      │  Browser    │      │  (Postman/Apps)    │   │   ║
║   │   └───────────┘      └─────────────┘      └────────────────────┘   │   ║
║   └─────────────────────────────────────────────────────────────────────┘   ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 3.2 Architectural Patterns

### Pattern 1: Model-View-Controller (MVC)

```
┌───────────────────────────────────────────────────────────┐
│                       MVC PATTERN                          │
│                                                           │
│   User                                                    │
│   Input      ┌──────────────────────────────────────┐    │
│     │        │              Controller               │    │
│     └───────▶│  - Receives user input                │    │
│              │  - Calls appropriate Model methods    │    │
│              │  - Selects View to render             │    │
│              └──────────────┬───────────────────────┘    │
│                             │                             │
│                   ┌─────────┴─────────┐                  │
│                   │                   │                  │
│                   ▼                   ▼                  │
│          ┌────────────────┐  ┌────────────────────┐      │
│          │     Model      │  │       View         │      │
│          │                │  │                    │      │
│          │ - Business     │  │ - Displays data    │      │
│          │   logic        │  │ - Sends user       │      │
│          │ - Data access  │  │   actions to       │      │
│          │ - Validation   │  │   Controller       │      │
│          │                │  │                    │      │
│          └───────┬────────┘  └────────────────────┘      │
│                  │                   ▲                    │
│                  │ notifies          │ reads data         │
│                  └───────────────────┘                    │
│                    (Observer pattern)                     │
└───────────────────────────────────────────────────────────┘

Real-world example:
  Model      → AttendanceRecord class + Database queries
  View       → React components (DashboardPage, AdminPage)
  Controller → Express.js route handlers (attendance.js)
```

---

### Pattern 2: Layered Architecture (N-Tier)

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYERED ARCHITECTURE                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 4:  ┌────────────────────────────────────────────┐   │
│            │         PRESENTATION LAYER                  │   │
│            │         (React Components / UI)            │   │
│            │  - Renders UI, handles user events          │   │
│            │  - Calls Application Layer APIs             │   │
│            └────────────────────┬───────────────────────┘   │
│                                 │ HTTP/REST calls            │
│  Layer 3:  ┌────────────────────▼───────────────────────┐   │
│            │        APPLICATION LAYER                    │   │
│            │        (Express.js Route Handlers)          │   │
│            │  - Orchestrates use cases                   │   │
│            │  - Calls Service Layer                      │   │
│            └────────────────────┬───────────────────────┘   │
│                                 │ function calls             │
│  Layer 2:  ┌────────────────────▼───────────────────────┐   │
│            │          BUSINESS / SERVICE LAYER           │   │
│            │          (auth.js, scoring.js)              │   │
│            │  - Business rules and logic                 │   │
│            │  - Data transformation                      │   │
│            └────────────────────┬───────────────────────┘   │
│                                 │ SQL queries                │
│  Layer 1:  ┌────────────────────▼───────────────────────┐   │
│            │           DATA ACCESS LAYER                  │   │
│            │           (database.js)                     │   │
│            │  - Database queries and connections         │   │
│            │  - Data mapping and persistence             │   │
│            └────────────────────┬───────────────────────┘   │
│                                 │                           │
│  Layer 0:  ┌────────────────────▼───────────────────────┐   │
│            │            DATABASE                          │   │
│            │            (SQLite / PostgreSQL)            │   │
│            └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Rules:
  ✓ Each layer only calls the layer BELOW it
  ✓ Lower layers do not know about higher layers
  ✓ Layers can be replaced independently
```

---

### Pattern 3: Client-Server Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   CLIENT-SERVER PATTERN                     │
│                                                            │
│   ┌────────────┐                      ┌────────────────┐  │
│   │  Client 1  │────────────────────▶ │                │  │
│   │  (Browser) │                      │                │  │
│   └────────────┘                      │    SERVER      │  │
│                                       │                │  │
│   ┌────────────┐   Request/Response   │  - Express.js  │  │
│   │  Client 2  │◀───────────────────▶ │  - REST API    │  │
│   │  (Mobile)  │                      │  - Auth        │  │
│   └────────────┘                      │  - Business    │  │
│                                       │    Logic       │  │
│   ┌────────────┐                      │                │  │
│   │  Client 3  │────────────────────▶ │                │  │
│   │  (API)     │                      └───────┬────────┘  │
│   └────────────┘                              │           │
│                                               ▼           │
│                                      ┌────────────────┐   │
│                                      │   DATABASE     │   │
│                                      │   (SQLite)     │   │
│                                      └────────────────┘   │
└────────────────────────────────────────────────────────────┘

Variants:
  2-Tier: Client ←→ Server (simple applications)
  3-Tier: Client ←→ App Server ←→ Database (typical web apps)
  N-Tier: Client ←→ Gateway ←→ Microservices ←→ Databases
```

---

### Pattern 4: Repository Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    REPOSITORY PATTERN                       │
│                                                            │
│   ┌────────────────────┐   ┌─────────────────────────┐    │
│   │  FileParserService │   │  AnalyticsService       │    │
│   └────────┬───────────┘   └───────────┬─────────────┘    │
│            │                           │                   │
│            │                           │                   │
│            └──────────────┬────────────┘                   │
│                           │                                │
│                           ▼                                │
│            ┌──────────────────────────────┐               │
│            │    CENTRAL REPOSITORY        │               │
│            │    (Shared Database)         │               │
│            │                              │               │
│            │  attendance_records table    │               │
│            │  users table                 │               │
│            │  courses table               │               │
│            └──────────────┬───────────────┘               │
│                           │                                │
│            ┌──────────────┴────────────────┐              │
│            │                               │              │
│   ┌────────┴──────────┐   ┌───────────────┴───────┐       │
│   │  ReportService    │   │  NotificationService  │       │
│   └───────────────────┘   └───────────────────────┘       │
│                                                            │
│  All components share the same data store                  │
│  Coordination happens through the data, not direct calls   │
└────────────────────────────────────────────────────────────┘
```

---

### Pattern 5: Pipe and Filter Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   PIPE AND FILTER PATTERN                   │
│                                                            │
│   CSV File                                                 │
│    Input                                                   │
│      │                                                     │
│      ▼                                                     │
│   ┌──────────────┐                                         │
│   │   Filter 1   │  Read file bytes                        │
│   │   File       │  Detect encoding (UTF-8/ASCII)          │
│   │   Reader     │                                         │
│   └──────┬───────┘                                         │
│          │ raw bytes                                        │
│          ▼                                                  │
│   ┌──────────────┐                                         │
│   │   Filter 2   │  Parse CSV rows                         │
│   │   CSV        │  Split by delimiter                     │
│   │   Parser     │  Handle quoted fields                   │
│   └──────┬───────┘                                         │
│          │ string[][]                                       │
│          ▼                                                  │
│   ┌──────────────┐                                         │
│   │   Filter 3   │  Validate column headers                │
│   │   Schema     │  Check data types                       │
│   │   Validator  │  Flag missing fields                    │
│   └──────┬───────┘                                         │
│          │ valid rows                                       │
│          ▼                                                  │
│   ┌──────────────┐                                         │
│   │   Filter 4   │  Convert dates                          │
│   │   Data       │  Normalize status values                │
│   │   Transform  │  Map to database schema                 │
│   └──────┬───────┘                                         │
│          │ AttendanceRecord[]                               │
│          ▼                                                  │
│   ┌──────────────┐                                         │
│   │   Filter 5   │  Batch INSERT                           │
│   │   Database   │  Return stats                           │
│   │   Writer     │                                         │
│   └──────┬───────┘                                         │
│          │                                                 │
│          ▼                                                  │
│       Result                                               │
│      {inserted,                                            │
│       skipped,                                             │
│       errors}                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 3.3 Deployment Architecture

### Deployment Diagram: System to System Integration

```
╔═══════════════════════════════════════════════════════════════════════════╗
║              SYSTEM-TO-SYSTEM INTEGRATION ARCHITECTURE                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║   External Systems                Our System                              ║
║                                                                           ║
║  ┌─────────────────┐    HTTPS     ┌────────────────────┐                 ║
║  │  HR System      │◀────────────▶│  Attendance        │                 ║
║  │  (SAP/Oracle)   │  REST API    │  System (API)      │                 ║
║  └─────────────────┘              │                    │                 ║
║                                   │  ┌──────────────┐  │                 ║
║  ┌─────────────────┐   Webhooks   │  │  Integration │  │                 ║
║  │  Student Info   │─────────────▶│  │  Layer       │  │                 ║
║  │  System (SIS)   │              │  └──────────────┘  │                 ║
║  └─────────────────┘              │                    │                 ║
║                                   └────────────────────┘                 ║
║  ┌─────────────────┐                        │                            ║
║  │  Email Provider │    SMTP/API            │ Publishes events           ║
║  │  (SendGrid)     │◀───────────────────────┤                            ║
║  └─────────────────┘                        ▼                            ║
║                                  ┌────────────────────┐                  ║
║  ┌─────────────────┐             │  Message Queue     │                  ║
║  │  SMS Gateway    │             │  (RabbitMQ)        │                  ║
║  │  (Twilio)       │◀────────────│                    │                  ║
║  └─────────────────┘             └────────────────────┘                  ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 3.4 Quality Attributes and Trade-offs

### Quality Attribute Scenarios (Bass, Clements & Kazman model):

| Attribute | Stimulus | Environment | Response | Measure |
|-----------|---------|-------------|---------|---------|
| **Performance** | 1000 concurrent requests | Normal load | Process requests | < 2 sec response time |
| **Availability** | Server crash | Production | System recovers | 99.9% uptime/month |
| **Security** | SQL injection attempt | Public internet | Reject input | 0 successful attacks |
| **Modifiability** | New CSV format added | Development | Change parser | < 4 hours effort |
| **Testability** | Unit test run | Development | Provide test hooks | > 80% code coverage |

### Architecture Trade-off Matrix:

```
                 Perf  Security  Maintainability  Availability  Cost
                ─────────────────────────────────────────────────
Monolith         ●●●     ●●        ●●               ●●          ●●●●●
Microservices    ●●●●    ●●●●      ●●●●●            ●●●●●       ●●
Serverless       ●●●●●   ●●●       ●●●              ●●●●●       ●●●●
Layered          ●●●     ●●●       ●●●●             ●●●         ●●●●

Legend: ●●●●● = Excellent  ●●●● = Good  ●●● = Fair  ●● = Poor  ● = Bad
```

---

---

# 4. Design and Implementation

## Definition

Software design and implementation is the stage in the software engineering process at which an **executable software system** is developed. The inputs are the system architecture and more detailed system requirements; the output is the system code and documentation.

> "Design is a creative activity. There is no unique 'correct' design for any problem."
> — *Sommerville, Chapter 7*

---

## 4.1 Object-Oriented Design

### Key OO Principles (SOLID)

| Principle | Name | Description | Example |
|-----------|------|-------------|---------|
| **S** | Single Responsibility | A class should have only one reason to change | `UserRepository` only handles DB ops — not auth |
| **O** | Open/Closed | Open for extension, closed for modification | Add new parser via inheritance, not changing existing code |
| **L** | Liskov Substitution | Subtypes must be substitutable for base types | `AdminUser` can replace `User` everywhere |
| **I** | Interface Segregation | Many specific interfaces > one general interface | `IReadable`, `IWritable` vs one `IDataAccess` |
| **D** | Dependency Inversion | Depend on abstractions, not concretions | `AttendanceService` depends on `IRepository` not `SQLiteRepo` |

---

### OO Design Process (Sommerville's Steps)

```
Step 1: Understand and Define Context
  └── System interactions, what data flows in/out

Step 2: Design System Architecture
  └── Choose layered, MVC, microservices, etc.

Step 3: Identify Principal Objects
  └── From requirements: User, AttendanceRecord, Course, Report

Step 4: Develop Design Models
  └── Class diagrams, sequence diagrams

Step 5: Specify Interfaces
  └── Method signatures, API contracts, data contracts
```

---

### Interface Specification Example

```
Interface: IAttendanceRepository
═══════════════════════════════════════════════════════
METHOD: findByStudent(studentId: string, from: Date, to: Date)
  INPUTS:  studentId — unique student identifier
           from      — start of date range (inclusive)
           to        — end of date range (inclusive)
  RETURNS: AttendanceRecord[] — array of records (empty if none)
  THROWS:  DatabaseException if connection fails
  PRE:     studentId must be non-null, from <= to
  POST:    Returns only records for specified student in range

METHOD: batchInsert(records: AttendanceRecord[])
  INPUTS:  records — array of validated attendance records
  RETURNS: { inserted: number, skipped: number, errors: string[] }
  THROWS:  ValidationException if records malformed
  PRE:     records.length > 0
  POST:    All valid records persisted, duplicates skipped

METHOD: deleteByDate(date: Date)
  INPUTS:  date — the date to delete records for
  RETURNS: { deleted: number }
  THROWS:  DatabaseException
  PRE:     date must be valid Date object
  POST:    All records for that date removed from store
═══════════════════════════════════════════════════════
```

---

## 4.2 Design Patterns (Gang of Four)

### Creational Patterns

#### Singleton Pattern

Ensure only one instance of a class exists — typically for database connections.

```javascript
// Singleton: Database Connection
class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;          // return existing instance
    }
    this.connection = this.connect();    // create once
    Database.instance = this;
  }

  connect() {
    return new SQLiteConnection('./attendance.db');
  }

  static getInstance() {
    if (!Database.instance) {
      new Database();
    }
    return Database.instance;
  }
}

// Usage — always returns same instance
const db1 = Database.getInstance();
const db2 = Database.getInstance();
// db1 === db2  → true
```

---

#### Factory Method Pattern

Define an interface for creating an object, but let subclasses decide which class to instantiate.

```javascript
// Factory: File Parser
class FileParserFactory {
  static createParser(fileType) {
    switch (fileType.toLowerCase()) {
      case 'csv':   return new CSVParser();
      case 'xlsx':  return new ExcelParser();
      case 'json':  return new JSONParser();
      default:      throw new Error(`Unknown file type: ${fileType}`);
    }
  }
}

// Usage
const parser = FileParserFactory.createParser('csv');
const records = parser.parse(fileBuffer);
// No knowledge of which parser is used
```

---

#### Builder Pattern

Construct complex objects step by step.

```javascript
// Builder: Report
class ReportBuilder {
  constructor() {
    this.report = { filters: {}, sections: [], metadata: {} };
  }

  setDateRange(from, to) {
    this.report.filters.from = from;
    this.report.filters.to = to;
    return this;                     // fluent interface
  }

  setDepartment(dept) {
    this.report.filters.department = dept;
    return this;
  }

  addSummarySection() {
    this.report.sections.push('summary');
    return this;
  }

  addTrendChart() {
    this.report.sections.push('trends');
    return this;
  }

  build() {
    return this.report;
  }
}

// Usage
const report = new ReportBuilder()
  .setDateRange('2025-01-01', '2025-12-31')
  .setDepartment('Computer Science')
  .addSummarySection()
  .addTrendChart()
  .build();
```

---

### Structural Patterns

#### Adapter Pattern

Convert an interface into another interface that clients expect.

```javascript
// Adapter: External HR System API
class HRSystemAdapter {
  constructor(externalHRApi) {
    this.hrApi = externalHRApi;       // old/external interface
  }

  // Our system expects: getEmployee(id)
  // External API provides: fetchStaffData(staffCode)
  getEmployee(id) {
    const staffData = this.hrApi.fetchStaffData(`STAFF_${id}`);
    return {                          // transform to our format
      id:         staffData.employee_number,
      name:       `${staffData.first_name} ${staffData.last_name}`,
      department: staffData.dept_code,
      email:      staffData.work_email
    };
  }
}

// Our system uses the adapter — doesn't know about external API
const hrSystem = new HRSystemAdapter(new LegacyHRAPI());
const employee = hrSystem.getEmployee(123);
```

---

#### Facade Pattern

Provide a simplified interface to a complex subsystem.

```javascript
// Facade: Attendance Processing (hides complexity)
class AttendanceFacade {
  constructor() {
    this.parser    = new FileParserFactory();
    this.validator = new AttendanceValidator();
    this.repo      = new AttendanceRepository();
    this.notifier  = new NotificationService();
  }

  // Simple interface: one method hides all complexity
  async processUpload(file, uploadedBy) {
    const parser    = this.parser.createParser(file.type);
    const rawData   = parser.parse(file.buffer);
    const validated = this.validator.validate(rawData);
    const result    = await this.repo.batchInsert(validated.valid);
    await this.notifier.notifyLowAttendance(validated.valid);
    return { ...result, errors: validated.errors };
  }
}

// Client uses one simple method
const facade = new AttendanceFacade();
const result = await facade.processUpload(uploadedFile, adminUser);
```

---

#### Decorator Pattern

Add responsibilities to objects dynamically.

```javascript
// Decorator: Logging and Caching around Repository
class LoggingRepository {
  constructor(repository) {
    this.repository = repository;
  }

  async findByStudent(studentId, from, to) {
    console.log(`[LOG] findByStudent(${studentId}, ${from}, ${to})`);
    const start = Date.now();
    const result = await this.repository.findByStudent(studentId, from, to);
    console.log(`[LOG] Completed in ${Date.now() - start}ms`);
    return result;
  }
}

class CachingRepository {
  constructor(repository, cache) {
    this.repository = repository;
    this.cache = cache;
  }

  async findByStudent(studentId, from, to) {
    const key = `student:${studentId}:${from}:${to}`;
    const cached = await this.cache.get(key);
    if (cached) return JSON.parse(cached);

    const result = await this.repository.findByStudent(studentId, from, to);
    await this.cache.set(key, JSON.stringify(result), 300); // 5 min TTL
    return result;
  }
}

// Layer decorators
const repo = new CachingRepository(
               new LoggingRepository(
                 new AttendanceRepository(db)
               ),
               redisCache
             );
```

---

### Behavioral Patterns

#### Observer Pattern

Define a one-to-many dependency so when one object changes state, all dependents are notified automatically.

```javascript
// Observer: Attendance Events
class AttendanceEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}

// Observers
const emitter = new AttendanceEventEmitter();

emitter.on('attendance.low', (data) => {
  emailService.send(data.studentEmail, 'Low attendance warning');
});

emitter.on('attendance.low', (data) => {
  auditLog.record(`Low attendance for student ${data.studentId}`);
});

emitter.on('attendance.low', (data) => {
  dashboardStore.updateAlert(data.studentId, data.percentage);
});

// When attendance drops — all observers notified
emitter.emit('attendance.low', {
  studentId:    123,
  studentEmail: 'student@uni.edu',
  percentage:   68
});
```

---

#### Strategy Pattern

Define a family of algorithms, encapsulate each one, and make them interchangeable.

```javascript
// Strategy: Scoring Algorithm
class AttendanceScorer {
  constructor(strategy) {
    this.strategy = strategy;      // inject strategy
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  calculate(records) {
    return this.strategy.calculate(records);
  }
}

class SimplePercentageStrategy {
  calculate(records) {
    const present = records.filter(r => r.status === 'present').length;
    return (present / records.length) * 100;
  }
}

class WeightedStrategy {
  calculate(records) {
    const weights = { present: 1, late: 0.5, absent: 0, excused: 0.75 };
    const total = records.reduce((sum, r) => sum + (weights[r.status] || 0), 0);
    return (total / records.length) * 100;
  }
}

// Usage — swap strategy at runtime
const scorer = new AttendanceScorer(new SimplePercentageStrategy());
const simpleScore = scorer.calculate(records);

scorer.setStrategy(new WeightedStrategy());
const weightedScore = scorer.calculate(records);
```

---

## 4.3 Component-Based Software Engineering (CBSE)

Building systems by **integrating pre-built, reusable components** rather than building from scratch.

### Component Properties:

| Property | Description |
|----------|-------------|
| **Standardized** | Conforms to a component model |
| **Independent** | No external dependencies beyond the interface |
| **Composable** | Can be combined with other components |
| **Deployable** | Can be deployed as a standalone entity |
| **Documented** | Complete API documentation |

### CBSE Process:

```
Requirements
     │
     ▼
┌─────────────────────────────────────────────┐
│  Component Requirements Specification       │
│  What components are needed?                │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│  Component Search                           │
│  Search existing repos (npm, Maven, NuGet)  │
│  Evaluate fit against requirements          │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
   [found suitable]          [not found]
          │                         │
          ▼                         ▼
┌──────────────────┐      ┌──────────────────────┐
│ Component        │      │ Build new component  │
│ Adaptation       │      │ following standards  │
│ (configure/wrap) │      └─────────────────────┘
└──────────┬───────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│  Architecture Design with Components        │
│  How do components interact?                │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│  Integration and Composition                │
│  Wire components together                  │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│  System Testing                             │
└─────────────────────────────────────────────┘
```

---

## 4.4 Implementation Issues

### Open Source Development Considerations

| Concern | Description | Example |
|---------|-------------|---------|
| **License** | Type of license determines usage rights | MIT (permissive), GPL (copyleft) |
| **Support** | Community vs. commercial support | React (Meta backed) vs. small library |
| **Maintenance** | Is the project actively maintained? | Check last commit date |
| **Security** | Known CVEs and vulnerability fixes | npm audit |
| **Integration** | How well does it fit the tech stack | Node.js compatible |

### Configuration Management

| Activity | Description | Tool |
|----------|-------------|------|
| **Version Control** | Track source code changes | Git |
| **Build Management** | Automate build process | npm scripts |
| **Issue Tracking** | Track bugs and changes | GitHub Issues |
| **Release Management** | Package and distribute releases | GitHub Releases |
| **CI/CD** | Automate testing and deployment | GitHub Actions, Railway |

### Host-Target Development Model

```
┌────────────────────────────────────────────────────────┐
│                DEVELOPMENT ENVIRONMENT (Host)           │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  VSCode IDE + Extensions                         │  │
│  │  Node.js + npm                                   │  │
│  │  Git + GitHub                                    │  │
│  │  Vitest / Jest (testing)                         │  │
│  │  ESLint + Prettier (code quality)                │  │
│  └──────────────────────────┬───────────────────────┘  │
└─────────────────────────────┼──────────────────────────┘
                              │
                         Deploy/Ship
                              │
┌─────────────────────────────▼──────────────────────────┐
│                 TARGET ENVIRONMENT                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Railway / Render / Vercel                       │  │
│  │  Node.js runtime                                 │  │
│  │  SQLite / PostgreSQL database                    │  │
│  │  NGINX reverse proxy                             │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 4.5 Testing

### Testing Levels (V-Model):

```
Requirements ──────────────────────────────────▶ Acceptance Testing
    │                                                     │
    Functional Design ──────────────────▶ System Testing  │
          │                                    │          │
          Architecture ──────▶ Integration Testing        │
               │                    │                    │
               Detailed Design ─▶ Unit Testing           │
                    │          │         │               │
                    └──────────┘         └───────────────┘
                     Coding               Test Execution
```

### Unit Testing with TDD:

```
┌─────────────────────────────────────────────────────┐
│              RED → GREEN → REFACTOR                  │
│                                                     │
│   Step 1: Write Failing Test (RED)                  │
│   ───────────────────────────────                   │
│   test('should mark student as absent', () => {     │
│     const record = new AttendanceRecord(...);       │
│     record.markAbsent();                            │
│     expect(record.status).toBe('absent');           │
│   });                                               │
│                                                     │
│   Step 2: Write Minimal Code (GREEN)                │
│   ───────────────────────────────────               │
│   markAbsent() {                                    │
│     this.status = 'absent';                         │
│   }                                                 │
│                                                     │
│   Step 3: Refactor (REFACTOR)                       │
│   ─────────────────────────                         │
│   updateStatus(status) {                            │
│     const valid = ['present','absent','late'];      │
│     if (!valid.includes(status)) throw new Error(); │
│     this.status = status;                           │
│   }                                                 │
│   markAbsent() { this.updateStatus('absent'); }     │
└─────────────────────────────────────────────────────┘
```

### Testing Types Summary:

| Test Type | Who | When | Tools | Goal |
|-----------|-----|------|-------|------|
| **Unit Test** | Developer | During coding | Vitest, Jest | Test individual functions |
| **Integration Test** | Developer | After unit tests | Supertest | Test API endpoints |
| **System Test** | QA Team | Before release | Playwright, Cypress | Test full user flows |
| **Acceptance Test** | Customer/PO | Before sign-off | Manual / BDD | Validate requirements met |
| **Regression Test** | CI/CD pipeline | Every commit | Automated | Ensure nothing broke |
| **Performance Test** | DevOps | Pre-production | k6, Artillery | Validate NFRs met |

---

---

## Summary — Four Pillars of Software Engineering

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║            SOFTWARE ENGINEERING — IAN SOMMERVILLE — COMPLETE OVERVIEW            ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  1. REQUIREMENTS ENGINEERING                                                     ║
║     What: Discover and document what the system must do                          ║
║     Who:  Business analysts, stakeholders, product owners                        ║
║     Key:  Functional reqs, NFRs, SRS document, traceability                     ║
║     Risk: Misunderstood requirements → wrong system built                        ║
║                                                                                  ║
║  2. SYSTEM MODELING                                                              ║
║     What: Create abstract representations of the system                          ║
║     Who:  System analysts, architects                                            ║
║     Key:  UML diagrams (Use Case, Sequence, Class, State, Activity)             ║
║     Risk: Over-modeling wastes time; under-modeling causes confusion            ║
║                                                                                  ║
║  3. ARCHITECTURAL DESIGN                                                         ║
║     What: Define overall system structure and patterns                           ║
║     Who:  Software architects, senior engineers                                  ║
║     Key:  MVC, Layered, Microservices, Client-Server, Pipe-Filter               ║
║     Risk: Bad architecture is expensive to fix after the fact                   ║
║                                                                                  ║
║  4. DESIGN AND IMPLEMENTATION                                                    ║
║     What: Build the executable system                                            ║
║     Who:  Software engineers, developers                                         ║
║     Key:  OO design, Design Patterns (GoF), CBSE, TDD                          ║
║     Risk: Technical debt accumulates without clean design                        ║
║                                                                                  ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  INTERACTION TYPES COVERED:                                                      ║
║  ● User → System: Use Case Diagrams, Sequence Diagrams (Login, Upload, Report)  ║
║  ● System → System: OAuth, Message Queue, REST API Integration, HR Integration  ║
║                                                                                  ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  REFERENCE                                                                       ║
║  Sommerville, I. (2016). Software Engineering (10th ed.). Pearson Education.    ║
║  Chapters: 4 (RE), 5 (System Modeling), 6 (Architectural Design),              ║
║            7 (Design & Implementation), 17 (CBSE), 25 (Configuration Mgmt)     ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

*Document generated for educational reference. Based on Ian Sommerville's Software Engineering, 10th Edition.*
