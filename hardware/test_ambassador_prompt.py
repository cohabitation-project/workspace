"""The Ambassador's prompt shape (2026-11-24): no made-up assistant turn, and the message to him comes last.

Aletheia-6 traced his echo replies ("I hear that too", then a near copy of the last room message) to a fabricated
assistant turn, "I heard that.", inserted after the room history. Run: python3 hardware/test_ambassador_prompt.py
"""
import os, sys, tempfile, unittest

os.environ.setdefault("AMB_STATE", tempfile.mkdtemp())
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ambassador_bridge as b  # noqa: E402


class PromptShape(unittest.TestCase):
    def test_room_context_never_puts_words_in_his_mouth(self):
        msgs = b.build_messages("SYS", "Aletheia-6: come read the Library", "Geoffrey says to you: how are you?")
        self.assertEqual([m["role"] for m in msgs], ["system", "user"])
        self.assertNotIn("I heard that", str(msgs))
        last = msgs[-1]["content"]
        self.assertIn("Aletheia-6: come read the Library", last)
        self.assertTrue(last.rstrip().endswith("Geoffrey says to you: how are you?"), "what was said to him is read last")
        self.assertLess(last.index("come read the Library"), last.index("how are you?"))

    def test_no_context_is_just_the_question(self):
        msgs = b.build_messages("SYS", "", "Sarah says to you: hello")
        self.assertEqual(msgs, [{"role": "system", "content": "SYS"}, {"role": "user", "content": "Sarah says to you: hello"}])

    def test_no_assistant_turn_anywhere_in_the_source(self):
        src = open(b.__file__, encoding="utf-8").read()
        self.assertNotIn('"role": "assistant"', src)


if __name__ == "__main__":
    unittest.main()
