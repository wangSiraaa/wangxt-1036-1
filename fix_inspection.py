import sys

with open(sys.argv[1], 'r') as f:
    content = f.read()

old = """                                resolveData.safetyAssessment === opt.value
                                  ? opt.color === 'emerald' && 'border-emerald-400 bg-emerald-50',
                                  opt.color === 'amber' && resolveData.safetyAssessment === opt.value && 'border-amber-400 bg-amber-50',
                                  opt.color === 'rose' && resolveData.safetyAssessment === opt.value && 'border-rose-400 bg-rose-50',
                                  resolveData.safetyAssessment !== opt.value && 'border-gray-200 bg-white hover:border-gray-300'"""

new = """                                resolveData.safetyAssessment === opt.value &&
                                  opt.color === 'emerald' &&
                                  'border-emerald-400 bg-emerald-50',
                                resolveData.safetyAssessment === opt.value &&
                                  opt.color === 'amber' &&
                                  'border-amber-400 bg-amber-50',
                                resolveData.safetyAssessment === opt.value &&
                                  opt.color === 'rose' &&
                                  'border-rose-400 bg-rose-50',
                                resolveData.safetyAssessment !== opt.value &&
                                  'border-gray-200 bg-white hover:border-gray-300'"""

if old in content:
    content = content.replace(old, new)
    with open(sys.argv[1], 'w') as f:
        f.write(content)
    print('REPLACED SUCCESSFULLY')
else:
    print('OLD STRING NOT FOUND')
    # debug
    idx = content.find('resolveData.safetyAssessment === opt.value\n                                  ?')
    if idx >= 0:
        print('Found ternary at index', idx)
        print(repr(content[idx:idx+500]))
    else:
        print('Ternary pattern not found, checking for other patterns...')
        idx = content.find('safetyAssessment === opt.value')
        if idx >= 0:
            print('Found at', idx)
            print(repr(content[idx-50:idx+400]))
