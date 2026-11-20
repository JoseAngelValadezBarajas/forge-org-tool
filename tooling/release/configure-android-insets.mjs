import fs from 'node:fs';
import path from 'node:path';

/**
 * Tauri's generated MainActivity calls enableEdgeToEdge() and does nothing with the system bar
 * insets, so on Android 15+ the web page is drawn under the status bar and the navigation bar and
 * covers the app header. This patches the generated activity (the Android project is regenerated
 * by `tauri android init` on every build, so a checked-in edit would be lost) to pad the content
 * by the system bars, display cutouts and the keyboard.
 *
 * It fails loudly when the template is not the one it knows, so a Tauri upgrade that changes it is
 * caught by CI instead of silently shipping an app with a hidden header.
 */
const MARKER = 'FORGE: keep the web content clear of the system bars';

const IMPORTS = [
  'import android.view.View',
  'import androidx.core.view.ViewCompat',
  'import androidx.core.view.WindowInsetsCompat',
];

const LISTENER = `    // ${MARKER}, display cutouts and the keyboard.
    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
      view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
      WindowInsetsCompat.CONSUMED
    }
`;

export function patchMainActivity(source) {
  if (source.includes(MARKER)) return { source, changed: false };

  const known =
    /class MainActivity\s*:\s*TauriActivity\(\)/.test(source) &&
    source.includes('enableEdgeToEdge()') &&
    /super\.onCreate\(savedInstanceState\)\r?\n/.test(source) &&
    source.includes('import android.os.Bundle');
  if (!known) {
    throw new Error(
      'The generated MainActivity is not the Tauri template this script understands; update tooling/release/configure-android-insets.mjs.',
    );
  }

  let patched = source.replace(
    'import android.os.Bundle',
    `import android.os.Bundle\n${IMPORTS.join('\n')}`,
  );
  patched = patched.replace(
    /(super\.onCreate\(savedInstanceState\)\r?\n)/,
    (statement) => `${statement}${LISTENER}`,
  );
  return { source: patched, changed: true };
}

function findMainActivity(root) {
  const stack = [root];
  while (stack.length > 0) {
    const directory = stack.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === 'MainActivity.kt') return full;
    }
  }
  return null;
}

export function configureAndroidInsets(javaRoot) {
  if (!fs.existsSync(javaRoot)) {
    throw new Error(`Generated Android sources do not exist: ${javaRoot}`);
  }
  const activityPath = findMainActivity(javaRoot);
  if (!activityPath) throw new Error(`No MainActivity.kt under ${javaRoot}`);
  const { source, changed } = patchMainActivity(fs.readFileSync(activityPath, 'utf8'));
  if (changed) fs.writeFileSync(activityPath, source);
  return { activityPath, changed };
}

if (import.meta.main) {
  const javaRoot = path.resolve(
    process.env.ANDROID_JAVA_ROOT ?? 'apps/desktop/src-tauri/gen/android/app/src/main/java',
  );
  const { activityPath, changed } = configureAndroidInsets(javaRoot);
  console.log(`${changed ? 'Patched' : 'Already patched'}: ${activityPath}`);
}
