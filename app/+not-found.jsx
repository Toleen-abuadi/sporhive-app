// app/+not-found.js
import React from "react";
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../src/services/i18n/i18n";

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t("errors.notFoundTitle") }} />
      <View style={styles.container}>
        <Text style={styles.text}>{t("errors.notFoundMessage")}</Text>
        <Link href="/" style={styles.link}>
          <Text>{t("errors.notFoundAction")}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  text: { fontSize: 20, fontWeight: "600" },
  link: { marginTop: 15, paddingVertical: 15 },
});
