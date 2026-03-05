# Security Notes

## Known Vulnerabilities

### xlsx Package (High Severity)
- **Issue**: Prototype Pollution in SheetJS (GHSA-4r6h-8v6p-xvw6)
- **Status**: No fix available from maintainers yet
- **Mitigation**: The `excelParser.ts` file includes a `sanitizeString()` function that filters dangerous property names (`__proto__`, `constructor`, `prototype`) to prevent prototype pollution attacks
- **Impact**: Low risk in this application since we only parse file uploads and immediately validate all data

### Related CVEs
- Prototype Pollution vulnerability in xlsx
- Regular Expression Denial of Service (ReDoS) in xlsx

## Recommendations
1. Monitor GitHub advisory (https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) for patches
2. Consider switching to alternative Excel libraries if vulnerabilities are not patched soon
3. Keep input validation strict (already implemented via `sanitizeString()`)
4. Run regular npm audits and update when patches become available
