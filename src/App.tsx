import { makeStyles, tokens, Title1, Text } from '@fluentui/react-components'

// The realistic profile: makeStyles + tokens (heavy @griffel/react usage)
// rendered alongside real Fluent components (Title1 / Text) that transitively
// retain a reference to `RESET` from @griffel/react -> @griffel/core.
const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  card: {
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
})

export function App() {
  const styles = useStyles()
  return (
    <div className={styles.root}>
      <Title1>Repro Rolldown Griffel</Title1>
      <div className={styles.card}>
        <Text>Hello from a makeStyles + tokens component.</Text>
      </div>
    </div>
  )
}
