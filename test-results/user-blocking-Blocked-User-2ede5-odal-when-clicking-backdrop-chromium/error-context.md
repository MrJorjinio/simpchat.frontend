# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - generic [ref=e8]: 💬
    - heading "Sign In" [level=1] [ref=e9]
    - paragraph [ref=e10]: Welcome back to Simpchat
  - generic [ref=e11]:
    - generic [ref=e12]:
      - generic [ref=e13]: Email or Username
      - textbox "Email or Username" [ref=e14]:
        - /placeholder: john@example.com
    - generic [ref=e15]:
      - generic [ref=e16]: Password
      - generic [ref=e17]:
        - textbox "Password" [ref=e18]:
          - /placeholder: ••••••••
        - button [ref=e19] [cursor=pointer]:
          - img [ref=e20]
    - link "Forgot password?" [ref=e24] [cursor=pointer]:
      - /url: /forgot-password
    - button "Sign In" [disabled] [ref=e25]:
      - text: Sign In
      - img [ref=e26]
  - generic [ref=e28]:
    - paragraph [ref=e29]: Don't have an account?
    - link "Create Account →" [ref=e30] [cursor=pointer]:
      - /url: /register
```