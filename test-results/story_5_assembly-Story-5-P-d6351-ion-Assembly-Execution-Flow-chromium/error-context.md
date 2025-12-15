# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - heading "Maruka" [level=2] [ref=e5]
    - heading "Welcome!" [level=5] [ref=e6]
    - paragraph [ref=e7]: Please sign in to continue.
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Username
        - textbox "Username" [ref=e11]:
          - /placeholder: Enter username
          - text: eng_eric
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - textbox "Password" [ref=e14]:
          - /placeholder: Enter password
          - text: password123
      - button "Login" [ref=e15] [cursor=pointer]
  - region "Notifications Alt+T"
```