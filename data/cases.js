/* ============================================================
   CYBER INCIDENT SIMULATOR — CASE DATA
   All data below is 100% fictional and simulated for training
   purposes. No real IPs, domains, hashes, or persons are used.
   ============================================================ */

const CASES = [
  {
    id: "CASE-001",
    code: "001",
    title: "Phishing Breach",
    difficulty: "Easy",
    threatLevel: "MEDIUM",
    tagline: "Employee credentials were compromised through a suspicious email.",
    requires: null,
    xpReward: 850,

    evidence: {
      email: [
        {
          id: "ev-mail-1",
          from: "security-update@company-secure-verify.example",
          to: "j.martins@northfield-labs.local",
          subject: "URGENT: Account Verification Required",
          time: "09:02",
          body:
            "Dear User,\n\nOur system detected unusual sign-in activity on your account. " +
            "You must verify your identity within 24 hours or your account will be suspended.\n\n" +
            "Click below to verify now:\nhttp://northfield-labs.secure-verify.example/reset\n\n" +
            "Failure to comply will result in permanent loss of access.\n\nIT Security Team",
          indicators: [
            "Sender domain mimics the company domain but is not the real one",
            "Artificial urgency and threat of account suspension",
            "Link domain does not match the organization's real domain",
            "Generic greeting instead of the employee's name",
          ],
          status: "SUSPICIOUS",
        },
      ],
      network: [
        { time: "09:07:03", src: "CLIENT-04", dst: "UNKNOWN-HOST-77", note: "Outbound HTTP request", suspicious: true },
        { time: "09:07:05", src: "CLIENT-04", dst: "UNKNOWN-HOST-77", note: "Credential form submitted", suspicious: true },
        { time: "09:08:12", src: "UNKNOWN-HOST-77", dst: "AUTH-SERVER-01", note: "Authentication attempt using CLIENT-04 credentials", suspicious: true },
        { time: "09:08:14", src: "AUTH-SERVER-01", dst: "CLIENT-04", note: "Authentication success", suspicious: false },
        { time: "09:15:41", src: "AUTH-SERVER-01", dst: "FILE-SERVER-02", note: "Session token reused from new geographic region", suspicious: true },
      ],
      firewall: [
        { time: "09:07:02", source: "CLIENT-04", destination: "UNKNOWN-HOST-77", action: "ALLOW" },
        { time: "09:07:05", source: "CLIENT-04", destination: "UNKNOWN-HOST-77", action: "ALLOW" },
        { time: "09:08:12", source: "UNKNOWN-HOST-77", destination: "AUTH-SERVER-01", action: "ALERT" },
        { time: "09:15:41", source: "AUTH-SERVER-01", destination: "FILE-SERVER-02", action: "ALLOW" },
      ],
      userlogs: [
        { time: "08:41:00", user: "j.martins", event: "Login success", detail: "Standard workstation login" },
        { time: "09:07:05", user: "j.martins", event: "Credentials submitted", detail: "External form (unverified)" },
        { time: "09:08:14", user: "j.martins", event: "Login success", detail: "Unusual origin region flagged" },
        { time: "09:15:41", user: "j.martins", event: "File access", detail: "Accessed /reports/finance_q3.xlsx" },
      ],
      filesystem: {
        tree: ["documents", "reports", "backups", "logs", "suspicious_file.txt"],
        files: {
          "suspicious_file.txt": {
            type: "TXT",
            created: "09:08",
            modified: "09:09",
            hash: "SIMULATED_HASH_2C91A4",
            source: "Downloaded via browser session",
            status: "SUSPICIOUS",
            indicators: ["Created immediately after phishing link was opened", "Unrecognized origin"],
          },
        },
      },
      dns: [
        { time: "09:06:58", query: "northfield-labs.secure-verify.example", suspicious: true },
        { time: "09:07:00", query: "cdn.company-assets.local", suspicious: false },
      ],
      browser: [
        { time: "09:06:55", url: "mail.northfield-labs.local", note: "Inbox opened" },
        { time: "09:07:01", url: "http://northfield-labs.secure-verify.example/reset", note: "Phishing link opened", suspicious: true },
      ],
    },

    clues: [
      { id: "c1", text: "Sender domain does not match the real company domain.", xp: 20, ref: "ev-mail-1" },
      { id: "c2", text: "Credential form was submitted to an unknown external host.", xp: 25, ref: "network" },
      { id: "c3", text: "Login succeeded from an unusual geographic region shortly after.", xp: 25, ref: "userlogs" },
      { id: "c4", text: "A suspicious file appeared on disk right after the link was opened.", xp: 20, ref: "filesystem" },
    ],

    timeline: [
      { time: "08:41", title: "Employee Login", desc: "j.martins logs in from their usual workstation.", ref: "userlogs" },
      { time: "09:02", title: "Suspicious Email Received", desc: "A fake 'account verification' email arrives.", ref: "ev-mail-1" },
      { time: "09:07", title: "Link Accessed", desc: "Employee clicks the link and submits credentials.", ref: "browser" },
      { time: "09:08", title: "Unusual Authentication", desc: "The stolen credentials are used to log in from a new region.", ref: "network" },
      { time: "09:15", title: "Sensitive File Access", desc: "The attacker accesses a finance report.", ref: "userlogs" },
    ],

    networkMap: {
      nodes: [
        { id: "internet", label: "INTERNET", x: 50, y: 8, type: "cloud" },
        { id: "fw", label: "FIREWALL", x: 50, y: 26, type: "firewall" },
        { id: "client", label: "CLIENT-04", x: 25, y: 46, type: "host" },
        { id: "unknown", label: "UNKNOWN-HOST-77", x: 75, y: 46, type: "danger" },
        { id: "auth", label: "AUTH-SERVER-01", x: 25, y: 68, type: "server" },
        { id: "files", label: "FILE-SERVER-02", x: 55, y: 88, type: "server" },
      ],
      edges: [
        { from: "internet", to: "fw" },
        { from: "fw", to: "client" },
        { from: "fw", to: "unknown", suspicious: true },
        { from: "client", to: "unknown", suspicious: true },
        { from: "unknown", to: "auth", suspicious: true },
        { from: "auth", to: "files", suspicious: true },
      ],
    },

    threatAnalysis: {
      category: "Credential Compromise",
      initialAccess: "Phishing Email",
      persistence: "None Observed",
      privilegeEscalation: "None Observed",
      dataAccess: "Detected",
      exfiltration: "Possible",
      confidence: 74,
    },

    attackChain: ["PHISHING", "CREDENTIAL COMPROMISE", "UNAUTHORIZED ACCESS", "FILE ACCESS", "DATA EXPOSURE"],

    questions: [
      {
        q: "What was the initial attack vector?",
        options: ["Phishing email", "USB drop", "Brute-force attack", "Physical intrusion"],
        correct: 0,
        explanation: "The employee received a spoofed verification email leading to a fake login page.",
      },
      {
        q: "Which account was compromised?",
        options: ["a.chen", "j.martins", "r.okafor", "system-admin"],
        correct: 1,
        explanation: "The evidence consistently references j.martins' workstation and credentials.",
      },
      {
        q: "What suspicious activity followed the credential theft?",
        options: [
          "A login from an unusual region and access to a finance report",
          "A firewall rule change",
          "A new admin account was created",
          "The workstation was physically stolen",
        ],
        correct: 0,
        explanation: "Logs show authentication from a new region followed by access to finance_q3.xlsx.",
      },
      {
        q: "What system held the data that was ultimately accessed?",
        options: ["DNS server", "FILE-SERVER-02", "Firewall appliance", "Employee's personal laptop"],
        correct: 1,
        explanation: "FILE-SERVER-02 hosted the finance report accessed with the stolen session.",
      },
      {
        q: "What was the most likely attacker objective?",
        options: [
          "Disrupt the network for fun",
          "Access sensitive financial data",
          "Install ransomware",
          "Deface the company website",
        ],
        correct: 1,
        explanation: "The attack chain ends in access to sensitive financial reporting data.",
      },
      {
        q: "How could this incident have been prevented?",
        options: [
          "Stronger Wi-Fi password",
          "Security awareness training and multi-factor authentication",
          "Faster internet connection",
          "Larger monitor for the SOC team",
        ],
        correct: 1,
        explanation: "User training to spot phishing plus MFA would have blocked or limited this attack.",
      },
    ],
  },

  {
    id: "CASE-002",
    code: "002",
    title: "Insider Threat",
    difficulty: "Medium",
    threatLevel: "MEDIUM",
    tagline: "Sensitive files were accessed outside normal working hours.",
    requires: "CASE-001",
    xpReward: 1000,

    evidence: {
      email: [
        {
          id: "ev-mail-2",
          from: "d.reyes@northfield-labs.local",
          to: "personal-backup77@mailhost.example",
          subject: "backup files",
          time: "23:41",
          body: "attaching the client contracts folder for backup. delete after review.",
          indicators: [
            "Internal employee emailing sensitive files to a personal external address",
            "Sent well outside normal business hours",
            "Vague subject line intended to avoid attention",
          ],
          status: "SUSPICIOUS",
        },
      ],
      network: [
        { time: "23:38:02", src: "CLIENT-11", dst: "FILE-SERVER-02", note: "Bulk file access: /contracts/", suspicious: true },
        { time: "23:40:55", src: "CLIENT-11", dst: "MAIL-RELAY-01", note: "Outbound email with 3 large attachments", suspicious: true },
        { time: "23:41:03", src: "MAIL-RELAY-01", dst: "EXTERNAL-MAILHOST", note: "Email delivered to personal address", suspicious: true },
      ],
      firewall: [
        { time: "23:38:02", source: "CLIENT-11", destination: "FILE-SERVER-02", action: "ALLOW" },
        { time: "23:40:55", source: "CLIENT-11", destination: "MAIL-RELAY-01", action: "ALLOW" },
        { time: "23:41:03", source: "MAIL-RELAY-01", destination: "EXTERNAL-MAILHOST", action: "ALERT" },
      ],
      userlogs: [
        { time: "23:35:10", user: "d.reyes", event: "Badge-less VPN login", detail: "Login from home network, after hours" },
        { time: "23:38:02", user: "d.reyes", event: "Bulk file access", detail: "47 files opened in /contracts/ within 3 minutes" },
        { time: "23:40:55", user: "d.reyes", event: "Email sent", detail: "3 attachments sent to a non-corporate address" },
        { time: "07:12:00", user: "d.reyes", event: "Login success", detail: "Normal morning login, unaware of flag" },
      ],
      filesystem: {
        tree: ["contracts", "hr", "reports", "backups", "logs"],
        files: {
          "contracts_export.zip": {
            type: "ZIP",
            created: "23:39",
            modified: "23:39",
            hash: "SIMULATED_HASH_9D71B2",
            source: "Created by d.reyes on CLIENT-11",
            status: "SUSPICIOUS",
            indicators: ["Compressed immediately before the outbound email", "Contains 47 contract files"],
          },
        },
      },
      dns: [
        { time: "23:40:50", query: "mailhost.example", suspicious: true },
        { time: "23:38:00", query: "file-server-02.northfield-labs.local", suspicious: false },
      ],
      browser: [
        { time: "23:37:40", url: "webmail.northfield-labs.local", note: "Corporate webmail opened" },
        { time: "23:40:40", url: "mailhost.example/compose", note: "Personal webmail used to receive files", suspicious: true },
      ],
    },

    clues: [
      { id: "c1", text: "Login occurred from a home VPN well outside business hours.", xp: 20, ref: "userlogs" },
      { id: "c2", text: "47 contract files were opened in under 3 minutes — consistent with scripted bulk access.", xp: 25, ref: "network" },
      { id: "c3", text: "A zip archive of contracts was created moments before an outbound email.", xp: 25, ref: "filesystem" },
      { id: "c4", text: "The email was sent to a personal, non-corporate mail address.", xp: 20, ref: "ev-mail-2" },
    ],

    timeline: [
      { time: "23:35", title: "After-Hours VPN Login", desc: "d.reyes connects from a home network late at night.", ref: "userlogs" },
      { time: "23:38", title: "Bulk Contract Access", desc: "47 contract files are opened in rapid succession.", ref: "network" },
      { time: "23:39", title: "Archive Created", desc: "Files are compressed into contracts_export.zip.", ref: "filesystem" },
      { time: "23:41", title: "Email to Personal Address", desc: "The archive is emailed to an outside mailbox.", ref: "ev-mail-2" },
    ],

    networkMap: {
      nodes: [
        { id: "home", label: "HOME NETWORK", x: 15, y: 10, type: "cloud" },
        { id: "vpn", label: "VPN GATEWAY", x: 40, y: 24, type: "firewall" },
        { id: "client", label: "CLIENT-11", x: 40, y: 46, type: "host" },
        { id: "files", label: "FILE-SERVER-02", x: 68, y: 46, type: "server" },
        { id: "mail", label: "MAIL-RELAY-01", x: 40, y: 68, type: "server" },
        { id: "ext", label: "EXTERNAL MAILHOST", x: 75, y: 88, type: "danger" },
      ],
      edges: [
        { from: "home", to: "vpn" },
        { from: "vpn", to: "client" },
        { from: "client", to: "files", suspicious: true },
        { from: "client", to: "mail", suspicious: true },
        { from: "mail", to: "ext", suspicious: true },
      ],
    },

    threatAnalysis: {
      category: "Insider Data Theft",
      initialAccess: "Legitimate Credentials (Insider)",
      persistence: "Not Applicable",
      privilegeEscalation: "Not Applicable",
      dataAccess: "Confirmed",
      exfiltration: "Confirmed",
      confidence: 88,
    },

    attackChain: ["LEGITIMATE ACCESS", "BULK FILE COLLECTION", "ARCHIVE CREATION", "EXTERNAL EMAIL", "DATA EXFILTRATION"],

    questions: [
      {
        q: "What was the initial attack vector?",
        options: ["Malicious email link", "Legitimate insider credentials", "Malware infection", "Firewall misconfiguration"],
        correct: 1,
        explanation: "d.reyes used their own valid VPN credentials — this is an insider threat, not an external breach.",
      },
      {
        q: "Whose account was involved?",
        options: ["j.martins", "d.reyes", "unknown-host-77", "auth-server-01"],
        correct: 1,
        explanation: "All suspicious activity traces back to d.reyes' account and workstation.",
      },
      {
        q: "What suspicious activity occurred?",
        options: [
          "A brute-force password attack",
          "Bulk access and exfiltration of contract files after hours",
          "A denial-of-service attack",
          "A firewall rule was disabled",
        ],
        correct: 1,
        explanation: "47 files were accessed in minutes and emailed externally late at night.",
      },
      {
        q: "What system stored the accessed data?",
        options: ["MAIL-RELAY-01", "FILE-SERVER-02", "VPN Gateway", "DNS server"],
        correct: 1,
        explanation: "The contracts directory lived on FILE-SERVER-02.",
      },
      {
        q: "What was the likely objective?",
        options: [
          "Exfiltrate sensitive contracts for personal use",
          "Test the VPN connection speed",
          "Patch a software vulnerability",
          "Perform routine backups",
        ],
        correct: 0,
        explanation: "The pattern (bulk access, archiving, personal email) points to intentional exfiltration.",
      },
      {
        q: "How could this incident have been prevented or caught sooner?",
        options: [
          "Data loss prevention rules and anomaly alerts on bulk file access",
          "A longer employee badge lanyard",
          "Removing the office coffee machine",
          "Increasing office WiFi range",
        ],
        correct: 0,
        explanation: "DLP policies and behavioral alerting on unusual bulk access would flag this quickly.",
      },
    ],
  },

  {
    id: "CASE-003",
    code: "003",
    title: "Ransomware Incident",
    difficulty: "Hard",
    threatLevel: "HIGH",
    tagline: "Multiple systems suddenly became inaccessible.",
    requires: "CASE-002",
    xpReward: 1250,

    evidence: {
      email: [
        {
          id: "ev-mail-3",
          from: "invoices@vendor-billing-portal.example",
          to: "accounts@northfield-labs.local",
          subject: "Overdue Invoice #88213 Attached",
          time: "07:58",
          body: "Please find the overdue invoice attached. Immediate payment is required to avoid service interruption.",
          indicators: [
            "Unexpected invoice attachment from an unfamiliar vendor domain",
            "Pressure to act immediately",
            "Attachment executes a macro on open",
          ],
          status: "SUSPICIOUS",
        },
      ],
      network: [
        { time: "08:03:11", src: "CLIENT-19", dst: "STAGING-C2-HOST", note: "Beacon connection established", suspicious: true },
        { time: "08:04:45", src: "CLIENT-19", dst: "FILE-SERVER-02", note: "Rapid file-write pattern (mass encryption signature)", suspicious: true },
        { time: "08:05:02", src: "CLIENT-19", dst: "FILE-SERVER-03", note: "Rapid file-write pattern (mass encryption signature)", suspicious: true },
        { time: "08:06:30", src: "CLIENT-19", dst: "BACKUP-SERVER-01", note: "Attempted access to backup shares", suspicious: true },
      ],
      firewall: [
        { time: "08:03:11", source: "CLIENT-19", destination: "STAGING-C2-HOST", action: "ALERT" },
        { time: "08:04:45", source: "CLIENT-19", destination: "FILE-SERVER-02", action: "ALLOW" },
        { time: "08:06:30", source: "CLIENT-19", destination: "BACKUP-SERVER-01", action: "BLOCK" },
      ],
      userlogs: [
        { time: "07:59:20", user: "a.osei", event: "Macro-enabled attachment opened", detail: "invoice_88213.docm executed" },
        { time: "08:03:00", user: "SYSTEM", event: "New scheduled task created", detail: "Runs an unsigned executable at startup" },
        { time: "08:04:30", user: "SYSTEM", event: "Mass file rename", detail: "Hundreds of files renamed with .locked extension" },
      ],
      filesystem: {
        tree: ["documents", "reports", "backups", "logs", "READ_ME_RECOVER_FILES.txt"],
        files: {
          "READ_ME_RECOVER_FILES.txt": {
            type: "TXT",
            created: "08:05",
            modified: "08:05",
            hash: "SIMULATED_HASH_11FA02",
            source: "Dropped by encryption process",
            status: "MALICIOUS",
            indicators: ["Classic ransom note pattern", "Present in every affected directory"],
          },
          "invoice_88213.docm": {
            type: "DOCM",
            created: "07:58",
            modified: "07:58",
            hash: "SIMULATED_HASH_44CDE1",
            source: "Email attachment",
            status: "MALICIOUS",
            indicators: ["Contains an auto-executing macro", "Downloads a secondary payload on open"],
          },
        },
      },
      dns: [
        { time: "08:02:58", query: "staging-c2-host.example-net", suspicious: true },
        { time: "07:58:10", query: "vendor-billing-portal.example", suspicious: true },
      ],
      browser: [
        { time: "07:58:05", url: "webmail.northfield-labs.local", note: "Attachment downloaded from inbox" },
      ],
    },

    clues: [
      { id: "c1", text: "A macro-enabled invoice attachment silently executed a payload.", xp: 25, ref: "ev-mail-3" },
      { id: "c2", text: "A beacon connection to an external staging host was established minutes later.", xp: 25, ref: "network" },
      { id: "c3", text: "Mass file renaming with a ransomware extension began across multiple servers.", xp: 30, ref: "filesystem" },
      { id: "c4", text: "The malware attempted — and failed — to reach the backup server.", xp: 20, ref: "network" },
    ],

    timeline: [
      { time: "07:58", title: "Malicious Invoice Received", desc: "A macro-enabled document arrives disguised as an overdue invoice.", ref: "ev-mail-3" },
      { time: "07:59", title: "Macro Executed", desc: "a.osei opens the attachment and enables macros.", ref: "userlogs" },
      { time: "08:03", title: "Beacon Established", desc: "The infected host contacts an external staging server.", ref: "network" },
      { time: "08:04", title: "Mass Encryption Begins", desc: "Files on two servers begin being rewritten and renamed.", ref: "filesystem" },
      { time: "08:06", title: "Backup Access Blocked", desc: "The firewall blocks an attempt to reach backup shares.", ref: "network" },
    ],

    networkMap: {
      nodes: [
        { id: "internet", label: "INTERNET", x: 50, y: 6, type: "cloud" },
        { id: "c2", label: "STAGING-C2-HOST", x: 82, y: 20, type: "danger" },
        { id: "fw", label: "FIREWALL", x: 50, y: 24, type: "firewall" },
        { id: "client", label: "CLIENT-19", x: 30, y: 46, type: "host" },
        { id: "fs2", label: "FILE-SERVER-02", x: 55, y: 62, type: "server" },
        { id: "fs3", label: "FILE-SERVER-03", x: 78, y: 62, type: "server" },
        { id: "backup", label: "BACKUP-SERVER-01", x: 30, y: 88, type: "server" },
      ],
      edges: [
        { from: "internet", to: "fw" },
        { from: "fw", to: "client" },
        { from: "client", to: "c2", suspicious: true },
        { from: "client", to: "fs2", suspicious: true },
        { from: "client", to: "fs3", suspicious: true },
        { from: "client", to: "backup", suspicious: true },
      ],
    },

    threatAnalysis: {
      category: "Ransomware",
      initialAccess: "Malicious Email Attachment (Macro)",
      persistence: "Scheduled Task",
      privilegeEscalation: "Suspected (unconfirmed)",
      dataAccess: "Confirmed",
      exfiltration: "Not Observed",
      confidence: 91,
    },

    attackChain: ["MALICIOUS ATTACHMENT", "MACRO EXECUTION", "C2 BEACON", "PERSISTENCE", "MASS ENCRYPTION"],

    questions: [
      {
        q: "What was the initial attack vector?",
        options: ["USB drop", "Malicious macro-enabled email attachment", "SQL injection", "Weak Wi-Fi password"],
        correct: 1,
        explanation: "The invoice attachment contained a macro that triggered the infection chain.",
      },
      {
        q: "Which account opened the malicious file?",
        options: ["a.osei", "d.reyes", "j.martins", "SYSTEM"],
        correct: 0,
        explanation: "User logs show a.osei opened invoice_88213.docm and enabled macros.",
      },
      {
        q: "What suspicious activity followed execution?",
        options: [
          "A beacon to an external host, then mass file encryption",
          "A single failed login attempt",
          "A printer malfunction",
          "An email forwarding rule was added",
        ],
        correct: 0,
        explanation: "The infected host beaconed out, then began renaming files with a ransomware extension.",
      },
      {
        q: "Which systems were affected by encryption?",
        options: ["Only CLIENT-19", "FILE-SERVER-02 and FILE-SERVER-03", "The DNS server only", "BACKUP-SERVER-01"],
        correct: 1,
        explanation: "Both file servers show the mass file-write / rename signature.",
      },
      {
        q: "What was the attacker's objective?",
        options: [
          "Encrypt data and extort payment for recovery",
          "Silently observe network traffic",
          "Deface the company website",
          "Steal a single employee's password",
        ],
        correct: 0,
        explanation: "The ransom note and mass encryption indicate a classic ransomware extortion attempt.",
      },
      {
        q: "How could this incident have been prevented?",
        options: [
          "Disabling macros by default and isolating backups from the main network",
          "Using a longer WiFi password",
          "Buying faster workstations",
          "Removing the company's website",
        ],
        correct: 0,
        explanation: "Macro restrictions and offline/segmented backups would blunt this attack chain.",
      },
    ],
  },

  {
    id: "CASE-004",
    code: "004",
    title: "Data Exfiltration",
    difficulty: "Hard",
    threatLevel: "HIGH",
    tagline: "Large amounts of data were transferred from the internal network.",
    requires: "CASE-003",
    xpReward: 1400,

    evidence: {
      email: [],
      network: [
        { time: "02:11:04", src: "DB-SERVER-01", dst: "STAGING-HOST-05", note: "Unusual off-hours query volume spike", suspicious: true },
        { time: "02:14:22", src: "STAGING-HOST-05", dst: "CLOUD-DROP-EXT", note: "42 GB outbound transfer over encrypted tunnel", suspicious: true },
        { time: "02:14:22", src: "STAGING-HOST-05", dst: "CLOUD-DROP-EXT", note: "Transfer split into small chunks to avoid alerting thresholds", suspicious: true },
        { time: "02:31:09", src: "STAGING-HOST-05", dst: "CLOUD-DROP-EXT", note: "Transfer completed", suspicious: true },
      ],
      firewall: [
        { time: "02:11:04", source: "DB-SERVER-01", destination: "STAGING-HOST-05", action: "ALLOW" },
        { time: "02:14:22", source: "STAGING-HOST-05", destination: "CLOUD-DROP-EXT", action: "ALERT" },
        { time: "02:31:09", source: "STAGING-HOST-05", destination: "CLOUD-DROP-EXT", action: "ALLOW" },
      ],
      userlogs: [
        { time: "02:09:55", user: "svc-etl", event: "Service account login", detail: "Automated account logs in outside its normal schedule" },
        { time: "02:11:04", user: "svc-etl", event: "Large query executed", detail: "Full customer table selected" },
        { time: "02:14:22", user: "svc-etl", event: "Export job started", detail: "Export routed to an unrecognized cloud endpoint" },
      ],
      filesystem: {
        tree: ["etl", "exports", "logs", "customer_export_full.csv.gz"],
        files: {
          "customer_export_full.csv.gz": {
            type: "CSV.GZ",
            created: "02:12",
            modified: "02:14",
            hash: "SIMULATED_HASH_77B0F3",
            source: "Generated by svc-etl on STAGING-HOST-05",
            status: "SUSPICIOUS",
            indicators: ["Contains the full customer table, far larger than routine exports", "Uploaded to an unrecognized external destination"],
          },
        },
      },
      dns: [
        { time: "02:14:15", query: "cloud-drop-ext.file-share.example", suspicious: true },
      ],
      browser: [],
    },

    clues: [
      { id: "c1", text: "A service account logged in far outside its automated schedule.", xp: 25, ref: "userlogs" },
      { id: "c2", text: "A full customer table export was generated — much larger than routine jobs.", xp: 25, ref: "filesystem" },
      { id: "c3", text: "The transfer was deliberately chunked to stay under alert thresholds.", xp: 30, ref: "network" },
      { id: "c4", text: "Data was sent to an unrecognized external cloud storage endpoint.", xp: 25, ref: "dns" },
    ],

    timeline: [
      { time: "02:09", title: "Off-Schedule Service Login", desc: "svc-etl authenticates at an unusual hour.", ref: "userlogs" },
      { time: "02:11", title: "Full Table Query", desc: "The entire customer table is selected from DB-SERVER-01.", ref: "network" },
      { time: "02:12", title: "Export File Created", desc: "A compressed export file is generated on STAGING-HOST-05.", ref: "filesystem" },
      { time: "02:14", title: "Chunked Upload Begins", desc: "Data is uploaded in small pieces to an external endpoint.", ref: "network" },
      { time: "02:31", title: "Transfer Completed", desc: "The full 42 GB transfer finishes.", ref: "network" },
    ],

    networkMap: {
      nodes: [
        { id: "db", label: "DB-SERVER-01", x: 20, y: 30, type: "server" },
        { id: "staging", label: "STAGING-HOST-05", x: 50, y: 50, type: "host" },
        { id: "fw", label: "FIREWALL", x: 50, y: 70, type: "firewall" },
        { id: "cloud", label: "CLOUD-DROP-EXT", x: 80, y: 88, type: "danger" },
      ],
      edges: [
        { from: "db", to: "staging", suspicious: true },
        { from: "staging", to: "fw" },
        { from: "fw", to: "cloud", suspicious: true },
      ],
    },

    threatAnalysis: {
      category: "Data Exfiltration",
      initialAccess: "Compromised or Abused Service Account",
      persistence: "Unknown",
      privilegeEscalation: "Not Observed",
      dataAccess: "Confirmed (Full Customer Table)",
      exfiltration: "Confirmed",
      confidence: 85,
    },

    attackChain: ["ACCOUNT ABUSE", "BULK QUERY", "EXPORT CREATION", "CHUNKED TRANSFER", "EXTERNAL UPLOAD"],

    questions: [
      {
        q: "What account was used to carry out the exfiltration?",
        options: ["j.martins", "svc-etl (service account)", "d.reyes", "an unnamed guest account"],
        correct: 1,
        explanation: "All activity traces to the svc-etl automated service account, used outside its normal schedule.",
      },
      {
        q: "What made the transfer harder to detect?",
        options: [
          "It was chunked into small pieces to stay under alert thresholds",
          "It happened during business hours",
          "It used a well-known company domain",
          "It was announced in advance",
        ],
        correct: 0,
        explanation: "Network evidence shows the 42 GB transfer was deliberately split into smaller pieces.",
      },
      {
        q: "What data was accessed?",
        options: ["Employee lunch schedule", "The full customer table", "Printer configuration files", "Public marketing materials"],
        correct: 1,
        explanation: "The export file contained the entire customer table.",
      },
      {
        q: "Where did the data ultimately go?",
        options: ["An internal backup server", "An unrecognized external cloud endpoint", "A printer", "Nowhere — the transfer failed"],
        correct: 1,
        explanation: "DNS and network logs point to cloud-drop-ext.file-share.example, outside the organization.",
      },
      {
        q: "What was the attacker's likely objective?",
        options: [
          "Bulk theft of customer data",
          "Testing network latency",
          "Rebooting the database server",
          "Updating antivirus signatures",
        ],
        correct: 0,
        explanation: "A full customer table export sent externally indicates data theft.",
      },
      {
        q: "How could this have been prevented?",
        options: [
          "Restricting service account hours/scope and alerting on large or chunked outbound transfers",
          "Changing the office thermostat",
          "Buying a bigger monitor",
          "Disabling the company logo on emails",
        ],
        correct: 0,
        explanation: "Tighter service-account permissions and data-volume anomaly alerts would catch this pattern.",
      },
    ],
  },

  {
    id: "CASE-005",
    code: "005",
    title: "Advanced Persistence",
    difficulty: "Expert",
    threatLevel: "CRITICAL",
    tagline: "An unknown process repeatedly returned after being removed.",
    requires: "CASE-004",
    xpReward: 1600,

    evidence: {
      email: [],
      network: [
        { time: "03:02:11", src: "SERVER-07", dst: "RELAY-NODE-A", note: "Low-and-slow beacon, once every 6 hours", suspicious: true },
        { time: "09:02:14", src: "SERVER-07", dst: "RELAY-NODE-A", note: "Repeat beacon after 'removal'", suspicious: true },
        { time: "15:02:09", src: "SERVER-07", dst: "RELAY-NODE-B", note: "Beacon resumes from a second relay after first was blocked", suspicious: true },
      ],
      firewall: [
        { time: "03:02:11", source: "SERVER-07", destination: "RELAY-NODE-A", action: "ALLOW" },
        { time: "10:00:00", source: "SERVER-07", destination: "RELAY-NODE-A", action: "BLOCK" },
        { time: "15:02:09", source: "SERVER-07", destination: "RELAY-NODE-B", action: "ALERT" },
      ],
      userlogs: [
        { time: "02:58:40", user: "SYSTEM", event: "New service installed", detail: "Disguised as a legitimate update helper" },
        { time: "09:45:00", user: "soc-analyst", event: "Malicious service removed", detail: "Manually deleted after initial detection" },
        { time: "09:58:00", user: "SYSTEM", event: "Scheduled task re-created the service", detail: "Hidden persistence mechanism re-installed it" },
        { time: "15:00:00", user: "SYSTEM", event: "Registry run key added", detail: "Secondary persistence mechanism discovered" },
      ],
      filesystem: {
        tree: ["system32-like", "temp", "logs", "svchost_helper.exe"],
        files: {
          "svchost_helper.exe": {
            type: "EXE",
            created: "02:58",
            modified: "09:58",
            hash: "SIMULATED_HASH_A10F9C",
            source: "Dropped by initial installer, re-created by scheduled task",
            status: "MALICIOUS",
            indicators: [
              "Name mimics a legitimate system process but runs from a temp directory",
              "Re-created automatically after deletion",
              "Two independent persistence mechanisms found (task + registry key)",
            ],
          },
        },
      },
      dns: [
        { time: "03:02:05", query: "relay-node-a.dead-drop.example", suspicious: true },
        { time: "15:02:00", query: "relay-node-b.dead-drop.example", suspicious: true },
      ],
      browser: [],
    },

    clues: [
      { id: "c1", text: "A malicious service disguised itself as a legitimate system helper.", xp: 25, ref: "filesystem" },
      { id: "c2", text: "The service reappeared automatically after being manually removed.", xp: 30, ref: "userlogs" },
      { id: "c3", text: "A second, independent persistence mechanism (registry key) was found.", xp: 30, ref: "userlogs" },
      { id: "c4", text: "When one relay host was blocked, the beacon switched to a backup relay.", xp: 25, ref: "network" },
    ],

    timeline: [
      { time: "02:58", title: "Malicious Service Installed", desc: "A disguised service is silently installed on SERVER-07.", ref: "filesystem" },
      { time: "03:02", title: "Low-and-Slow Beacon Begins", desc: "The service beacons out infrequently to avoid detection.", ref: "network" },
      { time: "09:45", title: "Service Manually Removed", desc: "An analyst deletes the malicious service.", ref: "userlogs" },
      { time: "09:58", title: "Service Returns", desc: "A hidden scheduled task silently re-creates the service.", ref: "userlogs" },
      { time: "15:00", title: "Second Persistence Found", desc: "A registry run key is discovered as a backup mechanism.", ref: "userlogs" },
      { time: "15:02", title: "Beacon Switches Relay", desc: "After the first relay is blocked, the malware pivots to a backup relay host.", ref: "network" },
    ],

    networkMap: {
      nodes: [
        { id: "server", label: "SERVER-07", x: 45, y: 20, type: "host" },
        { id: "relayA", label: "RELAY-NODE-A", x: 20, y: 55, type: "danger" },
        { id: "relayB", label: "RELAY-NODE-B", x: 75, y: 55, type: "danger" },
        { id: "fw", label: "FIREWALL", x: 45, y: 80, type: "firewall" },
        { id: "soc", label: "SOC WORKSTATION", x: 45, y: 96, type: "server" },
      ],
      edges: [
        { from: "server", to: "relayA", suspicious: true },
        { from: "server", to: "relayB", suspicious: true },
        { from: "server", to: "fw" },
        { from: "fw", to: "soc" },
      ],
    },

    threatAnalysis: {
      category: "Advanced Persistent Threat",
      initialAccess: "Unknown (Under Investigation)",
      persistence: "Scheduled Task + Registry Run Key (Dual Mechanism)",
      privilegeEscalation: "Confirmed (SYSTEM-level service)",
      dataAccess: "Unconfirmed",
      exfiltration: "Suspected (Low-and-Slow Beaconing)",
      confidence: 79,
    },

    attackChain: ["INITIAL FOOTHOLD", "DISGUISED SERVICE", "DUAL PERSISTENCE", "BEACON C2", "RELAY FAILOVER"],

    questions: [
      {
        q: "Why did the malicious process keep returning after removal?",
        options: [
          "It had two independent persistence mechanisms",
          "The antivirus software was outdated",
          "The analyst reinstalled it by mistake",
          "It was a false positive that never actually returned",
        ],
        correct: 0,
        explanation: "Both a scheduled task and a registry run key re-created the malicious service independently.",
      },
      {
        q: "What system was affected?",
        options: ["SERVER-07", "The employee's personal phone", "The office printer", "The public website"],
        correct: 0,
        explanation: "All indicators (service, beacon, persistence) point to SERVER-07.",
      },
      {
        q: "What happened when the first relay host was blocked?",
        options: [
          "The malware stopped completely",
          "The beacon switched to a second, backup relay host",
          "The server crashed",
          "Nothing changed",
        ],
        correct: 1,
        explanation: "Logs show the beacon resuming on RELAY-NODE-B after RELAY-NODE-A was blocked.",
      },
      {
        q: "What privilege level did the malicious service run at?",
        options: ["Guest", "Standard user", "SYSTEM-level", "No privileges — it never executed"],
        correct: 2,
        explanation: "Threat analysis confirms the disguised service ran with SYSTEM-level privileges.",
      },
      {
        q: "What was the attacker's likely objective?",
        options: [
          "Maintain long-term covert access to the server",
          "Immediately deface a webpage",
          "Send a one-time phishing email",
          "Reset all user passwords",
        ],
        correct: 0,
        explanation: "Dual persistence and low-and-slow beaconing indicate a long-term access objective, characteristic of an APT.",
      },
      {
        q: "How should responders fully remediate this kind of threat?",
        options: [
          "Delete only the visible executable and consider it resolved",
          "Identify and remove every persistence mechanism, then monitor for renewed beaconing",
          "Simply rename the malicious file",
          "Ignore it since the beacon interval is slow",
        ],
        correct: 1,
        explanation: "Full remediation requires finding all persistence mechanisms, not just the first one found.",
      },
    ],
  },
];

if (typeof module !== "undefined") module.exports = CASES;
